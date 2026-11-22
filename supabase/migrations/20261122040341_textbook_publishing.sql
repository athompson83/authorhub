begin;
-- A book membership alone must not outlive workspace membership.
create or replace function public.has_book_access(target_book_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.book_memberships bm join public.books b on b.id=bm.book_id join public.organization_memberships om on om.organization_id=b.organization_id and om.user_id=bm.user_id where bm.book_id=target_book_id and bm.user_id=auth.uid());
$$;
create or replace function public.can_write_book(target_book_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.has_book_access(target_book_id) and exists(select 1 from public.book_memberships where book_id=target_book_id and user_id=auth.uid() and role in('owner','author','editor'));
$$;
create or replace function public.is_book_owner(target_book_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.has_book_access(target_book_id) and exists(select 1 from public.book_memberships where book_id=target_book_id and user_id=auth.uid() and role='owner');
$$;
revoke insert on public.manuscript_snapshots from authenticated;
revoke delete on public.manuscript_nodes from authenticated;
-- Append-only history captures the initial state and every successful save.
create table public.manuscript_revisions (
 id uuid primary key default gen_random_uuid(),
 book_id uuid not null references public.books(id) on delete cascade,
 node_id uuid not null,
 version bigint not null,
 title text not null,
 content jsonb not null,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 unique(node_id, version),
 foreign key(node_id, book_id) references public.manuscript_nodes(id, book_id) on delete cascade
);
alter table public.manuscript_revisions enable row level security;
revoke all on public.manuscript_revisions from anon,authenticated;
grant select on public.manuscript_revisions to authenticated;
create policy revisions_read on public.manuscript_revisions for select to authenticated using(public.has_book_access(book_id));
insert into public.manuscript_revisions(book_id,node_id,version,title,content,created_by)
 select book_id,id,content_version,title,content,updated_by from public.manuscript_nodes;
create function public.record_manuscript_revision() returns trigger language plpgsql security definer set search_path = public as $$
begin
 insert into public.manuscript_revisions(book_id,node_id,version,title,content,created_by)
 values(new.book_id,new.id,new.content_version,new.title,new.content,new.updated_by);
 return new;
end; $$;
create trigger manuscript_revision_insert after insert on public.manuscript_nodes for each row execute function public.record_manuscript_revision();
create trigger manuscript_revision_update after update on public.manuscript_nodes for each row when(old.content_version <> new.content_version) execute function public.record_manuscript_revision();
revoke all on function public.record_manuscript_revision() from public;

create table public.editions (
 id uuid primary key default gen_random_uuid(),
 book_id uuid not null references public.books(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200),
 config jsonb not null check(jsonb_typeof(config)='object'),
 version bigint not null default 1,
 created_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now(),
 unique(id, book_id)
);
alter table public.editions enable row level security;
revoke all on public.editions from anon,authenticated;
grant select, insert on public.editions to authenticated;
grant update(name,config,version) on public.editions to authenticated;
create policy editions_read on public.editions for select to authenticated using(public.has_book_access(book_id));
create policy editions_insert on public.editions for insert to authenticated with check(public.can_write_book(book_id) and created_by=auth.uid());
create policy editions_update on public.editions for update to authenticated using(public.can_write_book(book_id)) with check(public.can_write_book(book_id));
create function public.stamp_edition_version() returns trigger language plpgsql set search_path=public as $$
begin
 if new.version <> old.version+1 then raise exception 'edition version conflict' using errcode='40001'; end if;
 new.updated_at=now(); return new;
end; $$;
create trigger edition_version before update on public.editions for each row execute function public.stamp_edition_version();
create table public.publication_releases (
 id uuid primary key default gen_random_uuid(),
 book_id uuid not null references public.books(id) on delete cascade,
 edition_id uuid not null,
 name text not null check(length(trim(name)) between 1 and 200),
 payload jsonb not null,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 foreign key(edition_id,book_id) references public.editions(id,book_id)
);
alter table public.publication_releases enable row level security;
revoke all on public.publication_releases from anon,authenticated;
grant select on public.publication_releases to authenticated;
create policy releases_read on public.publication_releases for select to authenticated using(public.has_book_access(book_id));
create function public.freeze_publication(p_edition_id uuid,p_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare e public.editions; b public.books; nodes jsonb; release_id uuid;
begin
 select * into e from public.editions where id=p_edition_id for share;
 if e.id is null or not public.can_write_book(e.book_id) then raise exception 'publication denied' using errcode='42501'; end if;
 select * into b from public.books where id=e.book_id for share;
 -- One SELECT snapshot captures all nodes consistently, including concurrent edits.
 select coalesce(jsonb_agg(to_jsonb(n) order by n.position,n.id),'[]'::jsonb) into nodes from public.manuscript_nodes n where book_id=e.book_id;
 if jsonb_array_length(nodes)=0 then raise exception 'manuscript is empty'; end if;
 if coalesce(length(trim(e.config->>'author')),0)=0 then raise exception 'author is required'; end if;
 if exists(select 1 from jsonb_array_elements(nodes) n where jsonb_array_length(n->'content'->'content')=0) then raise exception 'empty manuscript chapter'; end if;
 insert into public.publication_releases(book_id,edition_id,name,payload,created_by)
 values(e.book_id,e.id,p_name,jsonb_build_object('frozenAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'schemaVersion',1,'rendererVersion','authorhub-1','book',to_jsonb(b),'edition',e.config,'nodes',nodes),auth.uid()) returning id into release_id;
 return release_id;
end; $$;
revoke all on function public.freeze_publication(uuid,text) from public;
grant execute on function public.freeze_publication(uuid,text) to authenticated;

-- Capture named snapshots in the database, rather than trusting client payloads.
create function public.snapshot_chapter(p_node_id uuid,p_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare n public.manuscript_nodes; snapshot_id uuid;
begin
 select * into n from public.manuscript_nodes where id=p_node_id for share;
 if n.id is null or not public.can_write_book(n.book_id) then raise exception 'snapshot denied' using errcode='42501'; end if;
 if length(trim(p_name)) not between 1 and 200 then raise exception 'invalid snapshot name'; end if;
 insert into public.manuscript_snapshots(book_id,node_id,name,snapshot_type,payload,created_by)
 values(n.book_id,n.id,p_name,'named',jsonb_build_object('content',n.content,'version',n.content_version,'title',n.title),auth.uid()) returning id into snapshot_id;
 return snapshot_id;
end; $$;
revoke all on function public.snapshot_chapter(uuid,text) from public;
grant execute on function public.snapshot_chapter(uuid,text) to authenticated;

create function public.edit_manuscript_structure(p_node_id uuid,p_version bigint,p_title text,p_kind public.manuscript_node_kind,p_direction integer default 0) returns bigint language plpgsql security definer set search_path=public as $$
declare n public.manuscript_nodes; neighbor public.manuscript_nodes; next_version bigint;
begin
 select * into n from public.manuscript_nodes where id=p_node_id;
 if n.id is null or not public.can_write_book(n.book_id) then raise exception 'write denied' using errcode='42501'; end if;
 if length(trim(p_title)) not between 1 and 200 or p_direction not in(-1,0,1) then raise exception 'invalid structure'; end if;
 perform 1 from public.books where id=n.book_id for update;
 update public.manuscript_nodes set title=trim(p_title),kind=p_kind,content_version=content_version+1 where id=n.id and content_version=p_version returning content_version into next_version;
 if next_version is null then raise exception 'version conflict' using errcode='40001'; end if;
 if p_direction<>0 then
  with ordered as(select id,row_number() over(order by position,id)*1000 as pos from public.manuscript_nodes where book_id=n.book_id and parent_id is not distinct from n.parent_id)
  update public.manuscript_nodes m set position=o.pos from ordered o where m.id=o.id;
  select * into n from public.manuscript_nodes where id=p_node_id;
  select * into neighbor from public.manuscript_nodes where book_id=n.book_id and parent_id is not distinct from n.parent_id and case when p_direction=-1 then (position,id)<(n.position,n.id) else (position,id)>(n.position,n.id) end order by case when p_direction=-1 then position end desc,case when p_direction=1 then position end asc,id limit 1;
  if neighbor.id is not null then
   update public.manuscript_nodes set position=neighbor.position where id=n.id;
   update public.manuscript_nodes set position=n.position where id=neighbor.id;
  end if;
 end if;
 return next_version;
end; $$;
revoke all on function public.edit_manuscript_structure(uuid,bigint,text,public.manuscript_node_kind,integer) from public;
grant execute on function public.edit_manuscript_structure(uuid,bigint,text,public.manuscript_node_kind,integer) to authenticated;
commit;
