begin;

create or replace function public.stamp_manuscript_node_updater()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

create trigger manuscript_nodes_stamp_updater
before update on public.manuscript_nodes
for each row execute function public.stamp_manuscript_node_updater();

drop policy if exists manuscript_nodes_update_writer on public.manuscript_nodes;
create policy manuscript_nodes_update_writer
on public.manuscript_nodes
for update to authenticated
using (public.can_write_book(book_id))
with check (public.can_write_book(book_id));

create or replace function public.prevent_manuscript_tree_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cycle_found boolean;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'manuscript node cannot parent itself';
  end if;

  with recursive ancestors as (
    select id, parent_id
    from public.manuscript_nodes
    where id = new.parent_id and book_id = new.book_id

    union all

    select parent.id, parent.parent_id
    from public.manuscript_nodes parent
    join ancestors child on parent.id = child.parent_id
    where parent.book_id = new.book_id
  )
  select exists (select 1 from ancestors where id = new.id)
  into cycle_found;

  if cycle_found then
    raise exception 'manuscript hierarchy cycle detected';
  end if;

  return new;
end;
$$;

create trigger manuscript_nodes_prevent_cycle
before insert or update of parent_id on public.manuscript_nodes
for each row execute function public.prevent_manuscript_tree_cycle();

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
    if tg_op = 'DELETE' then return old; end if;
    return new;
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

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

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
    if tg_op = 'DELETE' then return old; end if;
    return new;
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

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

commit;
