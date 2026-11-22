begin;
create table public.publication_export_jobs (
 id uuid primary key default gen_random_uuid(),
 book_id uuid not null references public.books(id) on delete cascade,
 release_id uuid not null references public.publication_releases(id) on delete cascade,
 format text not null check(format in('epub','docx','interior_pdf','cover_pdf','interior_html','cover_html','backup')),
 renderer_version text not null default 'authorhub-server-2' check(renderer_version='authorhub-server-2'),
 status text not null default 'queued' check(status in('queued','running','succeeded','failed')),
 attempts integer not null default 0 check(attempts between 0 and 3),
 lease_token uuid, leased_at timestamptz, error_code text,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), finished_at timestamptz,
 unique(release_id,format,renderer_version), unique(id,book_id)
);
create table public.edition_files (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null unique,
 book_id uuid not null references public.books(id) on delete cascade,
 storage_path text not null unique,
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 size_bytes bigint not null check(size_bytes>0),
 mime_type text not null,
 created_at timestamptz not null default now(),
 foreign key(job_id,book_id) references public.publication_export_jobs(id,book_id) on delete cascade
);
alter table public.publication_export_jobs enable row level security;
alter table public.edition_files enable row level security;
revoke all on public.publication_export_jobs,public.edition_files from anon,authenticated;
grant select on public.publication_export_jobs,public.edition_files to authenticated;
create policy export_jobs_read on public.publication_export_jobs for select to authenticated using(public.has_book_access(book_id));
create policy edition_files_read on public.edition_files for select to authenticated using(public.has_book_access(book_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('publication-artifacts','publication-artifacts',false,52428800,array['application/pdf','application/epub+zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/html','application/json']);
create policy publication_artifacts_read on storage.objects for select to authenticated
 using(bucket_id='publication-artifacts' and exists(select 1 from public.publication_releases r where r.book_id::text=split_part(storage.objects.name,'/',1) and r.id::text=split_part(storage.objects.name,'/',2) and public.has_book_access(r.book_id)));
create policy publication_artifacts_insert on storage.objects for insert to authenticated
 with check(bucket_id='publication-artifacts' and exists(select 1 from public.publication_export_jobs j where j.book_id::text=split_part(storage.objects.name,'/',1) and j.release_id::text=split_part(storage.objects.name,'/',2) and j.renderer_version=split_part(storage.objects.name,'/',3) and split_part(storage.objects.name,'/',4) like j.format||'.%' and j.status='running' and public.can_write_book(j.book_id)));
-- No UPDATE or DELETE policies: stored release artifacts cannot be overwritten.

create function public.request_publication_export(p_release_id uuid,p_format text) returns uuid language plpgsql security definer set search_path=public as $$
declare target_book uuid; job_id uuid;
begin
 select book_id into target_book from public.publication_releases where id=p_release_id;
 if target_book is null or not public.can_write_book(target_book) then raise exception 'export denied' using errcode='42501';end if;
 insert into public.publication_export_jobs(book_id,release_id,format,created_by) values(target_book,p_release_id,p_format,auth.uid()) on conflict(release_id,format,renderer_version) do nothing;
 select id into job_id from public.publication_export_jobs where release_id=p_release_id and format=p_format and renderer_version='authorhub-server-2';
 update public.publication_export_jobs set status='queued',error_code=null where id=job_id and attempts<3 and (status='failed' or (status='running' and leased_at<now()-interval '5 minutes'));
 return job_id;
end;$$;
create function public.claim_publication_export(p_job_id uuid) returns setof public.publication_export_jobs language plpgsql security definer set search_path=public as $$
begin
 return query update public.publication_export_jobs set status='running',attempts=attempts+1,leased_at=now(),lease_token=gen_random_uuid(),error_code=null
 where id=p_job_id and status='queued' and attempts<3 and public.can_write_book(book_id) returning *;
end;$$;
create function public.finish_publication_export(p_job_id uuid,p_lease_token uuid,p_path text,p_sha256 text,p_size bigint,p_mime text) returns void language plpgsql security definer set search_path=public as $$
declare j public.publication_export_jobs;
begin
 select * into j from public.publication_export_jobs where id=p_job_id for update;
 if j.id is null or not public.can_write_book(j.book_id) or j.status<>'running' or j.lease_token is distinct from p_lease_token then raise exception 'export completion denied' using errcode='42501';end if;
 if p_path not like j.book_id::text||'/'||j.release_id::text||'/'||j.renderer_version||'/'||j.format||'.%' or not exists(select 1 from storage.objects where bucket_id='publication-artifacts' and name=p_path) then raise exception 'artifact not stored';end if;
 insert into public.edition_files(job_id,book_id,storage_path,sha256,size_bytes,mime_type) values(j.id,j.book_id,p_path,p_sha256,p_size,p_mime);
 update public.publication_export_jobs set status='succeeded',finished_at=now(),lease_token=null where id=j.id;
end;$$;
create function public.fail_publication_export(p_job_id uuid,p_lease_token uuid) returns void language sql security definer set search_path=public as $$
 update public.publication_export_jobs set status='failed',error_code='render_failed',lease_token=null where id=p_job_id and status='running' and lease_token=p_lease_token and public.can_write_book(book_id);
$$;
revoke all on function public.request_publication_export(uuid,text),public.claim_publication_export(uuid),public.finish_publication_export(uuid,uuid,text,text,bigint,text),public.fail_publication_export(uuid,uuid) from public;
grant execute on function public.request_publication_export(uuid,text),public.claim_publication_export(uuid),public.finish_publication_export(uuid,uuid,text,text,bigint,text),public.fail_publication_export(uuid,uuid) to authenticated;
commit;
