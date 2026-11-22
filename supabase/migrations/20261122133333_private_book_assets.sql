begin;
create table public.book_assets(
 id uuid primary key,
 book_id uuid not null references public.books(id) on delete cascade,
 storage_path text not null unique,
 mime_type text not null check(mime_type in('image/png','image/jpeg')),
 width integer not null check(width>0),height integer not null check(height>0),
 size_bytes bigint not null check(size_bytes between 1 and 20971520),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 check(storage_path like book_id::text||'/'||id::text||'.%')
);
alter table public.book_assets enable row level security;
revoke all on public.book_assets from anon,authenticated;
grant select,insert on public.book_assets to authenticated;
create policy book_assets_read on public.book_assets for select to authenticated using(public.has_book_access(book_id));
create policy book_assets_insert on public.book_assets for insert to authenticated with check(public.can_write_book(book_id) and created_by=auth.uid() and exists(select 1 from storage.objects o where o.bucket_id='book-assets' and o.name=storage_path));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('book-assets','book-assets',false,20971520,array['image/png','image/jpeg']);
create policy book_asset_objects_read on storage.objects for select to authenticated using(bucket_id='book-assets' and exists(select 1 from public.books b where b.id::text=split_part(storage.objects.name,'/',1) and public.has_book_access(b.id)));
create policy book_asset_objects_insert on storage.objects for insert to authenticated with check(bucket_id='book-assets' and exists(select 1 from public.books b where b.id::text=split_part(storage.objects.name,'/',1) and public.can_write_book(b.id)));
-- Immutable object paths let every manuscript revision and release retain its
-- exact original artwork. Replacing artwork creates a new asset identity.
create function public.check_node_asset_refs() returns trigger language plpgsql security definer set search_path=public as $$
declare source text;
begin
 for source in select value#>>'{}' from jsonb_path_query(new.content,'$.**.src') as value loop
  if source like 'asset:%' and not exists(select 1 from public.book_assets where book_id=new.book_id and id::text=substring(source from 7)) then raise exception 'image asset does not belong to this book';end if;
 end loop;
 return new;
end;$$;
create trigger manuscript_asset_refs before insert or update of content on public.manuscript_nodes for each row execute function public.check_node_asset_refs();
create function public.check_edition_asset_refs() returns trigger language plpgsql security definer set search_path=public as $$
declare source text;
begin
 foreach source in array array[new.config->>'coverImage',new.config->>'backImage'] loop
  if source like 'asset:%' and not exists(select 1 from public.book_assets where book_id=new.book_id and id::text=substring(source from 7)) then raise exception 'cover asset does not belong to this book';end if;
 end loop;
 return new;
end;$$;
create trigger edition_asset_refs before insert or update of config on public.editions for each row execute function public.check_edition_asset_refs();
revoke all on function public.check_node_asset_refs(),public.check_edition_asset_refs() from public;
create or replace function public.freeze_publication(p_edition_id uuid,p_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare e public.editions;b public.books;nodes jsonb;assets jsonb;release_id uuid;
begin
 select * into e from public.editions where id=p_edition_id for share;
 if e.id is null or not public.can_write_book(e.book_id) then raise exception 'publication denied' using errcode='42501';end if;
 select * into b from public.books where id=e.book_id for share;
 select (select coalesce(jsonb_agg(to_jsonb(n) order by n.position,n.id),'[]'::jsonb) from public.manuscript_nodes n where n.book_id=e.book_id),
        (select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]'::jsonb) from public.book_assets a where a.book_id=e.book_id)
 into nodes,assets;
 if jsonb_array_length(nodes)=0 then raise exception 'manuscript is empty';end if;
 if coalesce(length(trim(e.config->>'author')),0)=0 then raise exception 'author is required';end if;
 if exists(select 1 from jsonb_array_elements(nodes) n where jsonb_array_length(n->'content'->'content')=0) then raise exception 'empty manuscript chapter';end if;
 insert into public.publication_releases(book_id,edition_id,name,payload,created_by)
 values(e.book_id,e.id,p_name,jsonb_build_object('schemaVersion',1,'rendererVersion','authorhub-1','frozenAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'book',to_jsonb(b),'edition',e.config,'nodes',nodes,'assets',assets),auth.uid()) returning id into release_id;
 return release_id;
end;$$;
commit;
