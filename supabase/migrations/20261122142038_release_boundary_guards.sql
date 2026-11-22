begin;
-- Application writers use the versioned RPC for all chapter changes.
revoke update(title,parent_id,position) on public.manuscript_nodes from authenticated;
revoke insert on public.manuscript_nodes from authenticated;
grant insert(id,book_id,parent_id,kind,title,position,created_by,updated_by) on public.manuscript_nodes to authenticated;
revoke update on public.books from authenticated;
grant update(title,subtitle,audience,purpose,target_word_count,status) on public.books to authenticated;

-- Removing a complete parent resource is distinct from removing its final
-- owner. Parent deletion cascades must be able to clean up their memberships.
create or replace function public.protect_last_book_owner() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='DELETE' and not exists(select 1 from public.books where id=old.book_id) then return old;end if;
 if old.role='owner' and (tg_op='DELETE' or new.role<>'owner') then
  perform 1 from public.books where id=old.book_id for update;
  if (select count(*) from public.book_memberships where book_id=old.book_id and role='owner')<=1 then raise exception 'book must retain at least one owner';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
create or replace function public.protect_last_organization_owner() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='DELETE' and not exists(select 1 from public.organizations where id=old.organization_id) then return old;end if;
 if old.role='owner' and (tg_op='DELETE' or new.role<>'owner') then
  perform 1 from public.organizations where id=old.organization_id for update;
  if (select count(*) from public.organization_memberships where organization_id=old.organization_id and role='owner')<=1 then raise exception 'organization must retain at least one owner';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;

drop function public.fail_publication_export(uuid,uuid);
create function public.fail_publication_export(p_job_id uuid,p_lease_token uuid,p_error_code text) returns void language sql security definer set search_path=public as $$
 update public.publication_export_jobs set status='failed',error_code=case when p_error_code in('artifact_too_large','asset_unavailable','asset_integrity_failure','missing_frozen_asset') then p_error_code else 'render_failed' end,lease_token=null where id=p_job_id and status='running' and lease_token=p_lease_token and public.can_write_book(book_id);
$$;
revoke all on function public.fail_publication_export(uuid,uuid,text) from public;
grant execute on function public.fail_publication_export(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
