begin;

create or replace function public.is_book_owner(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.book_memberships m
    where m.book_id = target_book_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

drop policy if exists book_memberships_manage_owner on public.book_memberships;

create policy book_memberships_insert_owner
on public.book_memberships
for insert
to authenticated
with check (public.is_book_owner(book_id));

create policy book_memberships_update_owner
on public.book_memberships
for update
to authenticated
using (public.is_book_owner(book_id))
with check (public.is_book_owner(book_id));

create policy book_memberships_delete_owner
on public.book_memberships
for delete
to authenticated
using (public.is_book_owner(book_id) and user_id <> auth.uid());

commit;
