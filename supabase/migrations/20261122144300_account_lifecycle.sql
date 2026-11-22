begin;
-- The task survives the deleted book and contains no manuscript or title.
create table public.book_deletion_tasks (
 id uuid primary key default gen_random_uuid(),
 book_id uuid not null unique,
 requested_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 completed_at timestamptz
);
alter table public.book_deletion_tasks enable row level security;
revoke all on public.book_deletion_tasks from anon,authenticated;
grant select on public.book_deletion_tasks to authenticated;
grant select,update on public.book_deletion_tasks to service_role;
create policy deletion_tasks_read on public.book_deletion_tasks for select to authenticated using(requested_by=auth.uid());
revoke delete on public.books from authenticated;
create function public.request_book_deletion(p_book_id uuid,p_confirmation text) returns uuid
language plpgsql security definer set search_path=public as $$
declare b public.books; task_id uuid;
begin
 select * into b from public.books where id=p_book_id for update;
 if b.id is null or not public.is_book_owner(b.id) then raise exception 'book deletion denied' using errcode='42501';end if;
 if p_confirmation is distinct from b.title then raise exception 'type the current book title to confirm deletion' using errcode='22023';end if;
 insert into public.book_deletion_tasks(book_id,requested_by) values(b.id,auth.uid()) returning id into task_id;
 delete from public.books where id=b.id;
 return task_id;
end;$$;
revoke all on function public.request_book_deletion(uuid,text) from public;
grant execute on function public.request_book_deletion(uuid,text) to authenticated;

-- Account removal never implicitly removes a shared manuscript. Authors first
-- delete or transfer their owned books; shared attribution keeps an anonymous
-- UUID so other collaborators' revision history remains internally consistent.
create function public.prepare_account_deletion(p_confirmation text) returns void
language plpgsql security definer set search_path=public as $$
declare target_user uuid:=auth.uid(); item record;
begin
 if target_user is null or not exists(select 1 from auth.users where id=target_user and last_sign_in_at>now()-interval '5 minutes') then raise exception 'sign in again before deleting your account' using errcode='42501';end if;
 if p_confirmation is distinct from 'DELETE MY ACCOUNT' then raise exception 'confirmation required' using errcode='22023';end if;
 perform 1 from public.organizations where id in(select organization_id from public.organization_memberships where user_id=target_user) order by id for update;
 perform 1 from public.books where id in(select book_id from public.book_memberships where user_id=target_user) order by id for update;
 if exists(select 1 from public.book_memberships where user_id=target_user and role='owner') then raise exception 'Delete or transfer ownership of your books before deleting your account.' using errcode='22023';end if;
 if exists(select 1 from public.book_deletion_tasks where requested_by=target_user and completed_at is null) then raise exception 'Finish pending book file cleanup before deleting your account.' using errcode='22023';end if;
 for item in select organization_id from public.organization_memberships where user_id=target_user and role='owner' loop
  if not exists(select 1 from public.organization_memberships where organization_id=item.organization_id and user_id<>target_user and role='owner') then
   if exists(select 1 from public.organization_memberships where organization_id=item.organization_id and user_id<>target_user) or exists(select 1 from public.books where organization_id=item.organization_id) then
    raise exception 'Transfer ownership of shared workspaces before deleting your account.' using errcode='22023';
   end if;
   delete from public.organizations where id=item.organization_id;
  end if;
 end loop;
 delete from public.book_memberships where user_id=target_user;
 delete from public.organization_memberships where user_id=target_user;
 update public.profiles set display_name=null where id=target_user;
end;$$;
revoke all on function public.prepare_account_deletion(text) from public;
grant execute on function public.prepare_account_deletion(text) to authenticated;
notify pgrst,'reload schema';
commit;
