begin;

-- Scope identity is immutable once a record is created. Moving a book or
-- manuscript node between tenant/book boundaries must be a deliberate future
-- administrative workflow, not an ordinary update.
create or replace function public.prevent_book_organization_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id <> old.organization_id then
    raise exception 'book organization cannot be changed';
  end if;
  return new;
end;
$$;

create trigger books_prevent_organization_change
before update on public.books
for each row execute function public.prevent_book_organization_change();

create or replace function public.prevent_node_book_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.book_id <> old.book_id then
    raise exception 'manuscript node book cannot be changed';
  end if;
  return new;
end;
$$;

create trigger manuscript_nodes_prevent_book_change
before update on public.manuscript_nodes
for each row execute function public.prevent_node_book_change();

-- Composite references ensure tree nodes, derived block rows, and snapshots
-- cannot point across book boundaries even if a caller knows another UUID.
alter table public.manuscript_nodes
  add constraint manuscript_nodes_id_book_unique unique (id, book_id);

alter table public.manuscript_nodes
  drop constraint manuscript_nodes_parent_id_fkey;

alter table public.manuscript_nodes
  add constraint manuscript_nodes_parent_same_book_fkey
  foreign key (parent_id, book_id)
  references public.manuscript_nodes (id, book_id)
  on delete cascade;

alter table public.manuscript_blocks
  drop constraint manuscript_blocks_node_id_fkey;

alter table public.manuscript_blocks
  add constraint manuscript_blocks_node_same_book_fkey
  foreign key (node_id, book_id)
  references public.manuscript_nodes (id, book_id)
  on delete cascade;

alter table public.manuscript_snapshots
  drop constraint manuscript_snapshots_node_id_fkey;

alter table public.manuscript_snapshots
  add constraint manuscript_snapshots_node_same_book_fkey
  foreign key (node_id, book_id)
  references public.manuscript_nodes (id, book_id)
  on delete cascade;

-- Organization membership administration is owner-only in the first release.
-- Admin semantics can be expanded later without allowing an admin to mint
-- ownership or demote the final owner today.
create or replace function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

drop policy if exists organization_memberships_insert_admin on public.organization_memberships;
drop policy if exists organization_memberships_update_admin on public.organization_memberships;
drop policy if exists organization_memberships_delete_admin on public.organization_memberships;

create policy organization_memberships_insert_owner
on public.organization_memberships
for insert to authenticated
with check (public.is_organization_owner(organization_id));

create policy organization_memberships_update_owner
on public.organization_memberships
for update to authenticated
using (public.is_organization_owner(organization_id))
with check (public.is_organization_owner(organization_id));

create policy organization_memberships_delete_owner
on public.organization_memberships
for delete to authenticated
using (public.is_organization_owner(organization_id) and user_id <> auth.uid());

create or replace function public.protect_last_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_count integer;
begin
  if old.role <> 'owner' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' and new.role = 'owner' then
    return new;
  end if;

  select count(*) into owner_count
  from public.organization_memberships
  where organization_id = old.organization_id and role = 'owner';

  if owner_count <= 1 then
    raise exception 'organization must retain at least one owner';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger organization_memberships_protect_last_owner
before update or delete on public.organization_memberships
for each row execute function public.protect_last_organization_owner();

create or replace function public.protect_last_book_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_count integer;
begin
  if old.role <> 'owner' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' and new.role = 'owner' then
    return new;
  end if;

  select count(*) into owner_count
  from public.book_memberships
  where book_id = old.book_id and role = 'owner';

  if owner_count <= 1 then
    raise exception 'book must retain at least one owner';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger book_memberships_protect_last_owner
before update or delete on public.book_memberships
for each row execute function public.protect_last_book_owner();

-- The block index is derived data. Authenticated clients may read it but may
-- not mutate it independently of the canonical manuscript save transaction.
drop policy if exists manuscript_blocks_write_writer on public.manuscript_blocks;
revoke insert, update, delete on public.manuscript_blocks from authenticated;

-- Prevent ordinary clients from bypassing the atomic save RPC by updating the
-- canonical content/version columns directly. Structural metadata can still be
-- edited under RLS. Future metadata actions should stamp updated_by in a server
-- action or dedicated RPC.
revoke update on public.manuscript_nodes from authenticated;
grant update (title, parent_id, position) on public.manuscript_nodes to authenticated;

-- Replace the save RPC with an explicitly authorized security-definer version.
-- It alone owns canonical content + derived block-index mutation.
create or replace function public.save_manuscript_node(
  p_node_id uuid,
  p_expected_version bigint,
  p_content jsonb,
  p_blocks jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  target_book_id uuid;
  next_version bigint;
begin
  if jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid manuscript content';
  end if;

  if jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'invalid manuscript block index';
  end if;

  select book_id into target_book_id
  from public.manuscript_nodes
  where id = p_node_id;

  if target_book_id is null or not public.can_write_book(target_book_id) then
    raise exception 'manuscript write denied' using errcode = '42501';
  end if;

  update public.manuscript_nodes
  set
    content = p_content,
    content_version = content_version + 1,
    updated_by = auth.uid()
  where id = p_node_id
    and content_version = p_expected_version
  returning content_version into next_version;

  if next_version is null then
    raise exception 'manuscript version conflict' using errcode = '40001';
  end if;

  delete from public.manuscript_blocks where node_id = p_node_id;

  insert into public.manuscript_blocks (
    block_id,
    book_id,
    node_id,
    block_type,
    ordinal,
    text_content
  )
  select
    indexed.block_id,
    target_book_id,
    p_node_id,
    indexed.block_type,
    indexed.ordinal,
    indexed.text_content
  from jsonb_to_recordset(p_blocks) as indexed(
    block_id text,
    block_type text,
    ordinal integer,
    text_content text
  );

  return next_version;
end;
$$;

revoke all on function public.save_manuscript_node(uuid, bigint, jsonb, jsonb) from public;
grant execute on function public.save_manuscript_node(uuid, bigint, jsonb, jsonb) to authenticated;

commit;
