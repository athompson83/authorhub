begin;

create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner', 'admin', 'member');
create type public.book_role as enum ('owner', 'author', 'editor', 'reviewer', 'researcher', 'viewer');
create type public.book_status as enum ('active', 'archived');
create type public.manuscript_node_kind as enum ('front_matter', 'part', 'chapter', 'section', 'back_matter');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  subtitle text,
  audience text,
  purpose text,
  target_word_count integer check (target_word_count is null or target_word_count > 0),
  status public.book_status not null default 'active',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index books_organization_status_idx on public.books (organization_id, status, updated_at desc);

create table public.book_memberships (
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.book_role not null,
  created_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

create table public.manuscript_nodes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  parent_id uuid references public.manuscript_nodes(id) on delete cascade,
  kind public.manuscript_node_kind not null,
  title text not null default '',
  position numeric(20, 8) not null default 1000,
  content jsonb not null default '{"version":1,"type":"doc","content":[]}'::jsonb,
  content_version bigint not null default 1,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manuscript_node_parent_not_self check (parent_id is null or parent_id <> id),
  constraint manuscript_content_is_object check (jsonb_typeof(content) = 'object')
);

create index manuscript_nodes_book_parent_position_idx on public.manuscript_nodes (book_id, parent_id, position);

create table public.manuscript_blocks (
  block_id text primary key check (block_id ~ '^blk_[A-Za-z0-9_-]{16,}$'),
  book_id uuid not null references public.books(id) on delete cascade,
  node_id uuid not null references public.manuscript_nodes(id) on delete cascade,
  block_type text not null,
  ordinal integer not null check (ordinal >= 0),
  text_content text not null default '',
  updated_at timestamptz not null default now(),
  unique (node_id, ordinal)
);

create index manuscript_blocks_book_node_idx on public.manuscript_blocks (book_id, node_id, ordinal);
create index manuscript_blocks_text_idx on public.manuscript_blocks using gin (to_tsvector('english', text_content));

create table public.manuscript_snapshots (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  node_id uuid references public.manuscript_nodes(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  snapshot_type text not null check (snapshot_type in ('named', 'publication')),
  payload jsonb not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index manuscript_snapshots_book_created_idx on public.manuscript_snapshots (book_id, created_at desc);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  kind text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, kind, idempotency_key)
);

create index jobs_queue_idx on public.jobs (status, available_at, created_at) where status = 'queued';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger books_set_updated_at before update on public.books for each row execute function public.set_updated_at();
create trigger manuscript_nodes_set_updated_at before update on public.manuscript_nodes for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs for each row execute function public.set_updated_at();

create or replace function public.bootstrap_authorhub_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  organization_id uuid;
  preferred_name text;
begin
  preferred_name := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1), 'My');

  insert into public.profiles (id, display_name)
  values (new.id, preferred_name)
  on conflict (id) do nothing;

  insert into public.organizations (name, created_by)
  values (preferred_name || '''s Workspace', new.id)
  returning id into organization_id;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (organization_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.bootstrap_authorhub_user();

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_organization_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.has_book_access(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.book_memberships m
    where m.book_id = target_book_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_write_book(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.book_memberships m
    where m.book_id = target_book_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'author', 'editor')
  );
$$;

create or replace function public.seed_book_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.book_memberships (book_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (book_id, user_id) do update set role = excluded.role;
  return new;
end;
$$;

create trigger on_book_created
after insert on public.books
for each row execute function public.seed_book_owner();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.books enable row level security;
alter table public.book_memberships enable row level security;
alter table public.manuscript_nodes enable row level security;
alter table public.manuscript_blocks enable row level security;
alter table public.manuscript_snapshots enable row level security;
alter table public.jobs enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_select_member on public.organizations for select to authenticated using (public.is_organization_member(id));
create policy organizations_update_admin on public.organizations for update to authenticated using (public.is_organization_admin(id)) with check (public.is_organization_admin(id));

create policy organization_memberships_select_member on public.organization_memberships for select to authenticated using (public.is_organization_member(organization_id));
create policy organization_memberships_insert_admin on public.organization_memberships for insert to authenticated with check (public.is_organization_admin(organization_id));
create policy organization_memberships_update_admin on public.organization_memberships for update to authenticated using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy organization_memberships_delete_admin on public.organization_memberships for delete to authenticated using (public.is_organization_admin(organization_id) and user_id <> auth.uid());

create policy books_select_member on public.books for select to authenticated using (public.has_book_access(id));
create policy books_insert_org_member on public.books for insert to authenticated with check (created_by = auth.uid() and public.is_organization_member(organization_id));
create policy books_update_writer on public.books for update to authenticated using (public.can_write_book(id)) with check (public.is_organization_member(organization_id));
create policy books_delete_owner on public.books for delete to authenticated using (
  exists (select 1 from public.book_memberships m where m.book_id = id and m.user_id = auth.uid() and m.role = 'owner')
);

create policy book_memberships_select_member on public.book_memberships for select to authenticated using (public.has_book_access(book_id));
create policy book_memberships_manage_owner on public.book_memberships for all to authenticated
  using (exists (select 1 from public.book_memberships owner_membership where owner_membership.book_id = book_id and owner_membership.user_id = auth.uid() and owner_membership.role = 'owner'))
  with check (exists (select 1 from public.book_memberships owner_membership where owner_membership.book_id = book_id and owner_membership.user_id = auth.uid() and owner_membership.role = 'owner'));

create policy manuscript_nodes_select_member on public.manuscript_nodes for select to authenticated using (public.has_book_access(book_id));
create policy manuscript_nodes_insert_writer on public.manuscript_nodes for insert to authenticated with check (created_by = auth.uid() and updated_by = auth.uid() and public.can_write_book(book_id));
create policy manuscript_nodes_update_writer on public.manuscript_nodes for update to authenticated using (public.can_write_book(book_id)) with check (updated_by = auth.uid() and public.can_write_book(book_id));
create policy manuscript_nodes_delete_writer on public.manuscript_nodes for delete to authenticated using (public.can_write_book(book_id));

create policy manuscript_blocks_select_member on public.manuscript_blocks for select to authenticated using (public.has_book_access(book_id));
create policy manuscript_blocks_write_writer on public.manuscript_blocks for all to authenticated using (public.can_write_book(book_id)) with check (public.can_write_book(book_id));

create policy manuscript_snapshots_select_member on public.manuscript_snapshots for select to authenticated using (public.has_book_access(book_id));
create policy manuscript_snapshots_insert_writer on public.manuscript_snapshots for insert to authenticated with check (created_by = auth.uid() and public.can_write_book(book_id));

create policy jobs_select_org_member on public.jobs for select to authenticated using (public.is_organization_member(organization_id));
create policy jobs_insert_org_member on public.jobs for insert to authenticated with check (created_by = auth.uid() and public.is_organization_member(organization_id));

commit;
