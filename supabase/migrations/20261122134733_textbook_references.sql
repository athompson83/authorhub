begin;
create table public.book_sources(
 id uuid primary key default gen_random_uuid(),book_id uuid not null references public.books(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 500),author text not null default '',year text not null default '',publisher text not null default '',url text not null default '',doi text not null default '',notes text not null default '',
 version bigint not null default 1,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),unique(id,book_id)
);
alter table public.book_sources enable row level security;
revoke all on public.book_sources from anon,authenticated;
grant select,insert on public.book_sources to authenticated;
grant update(title,author,year,publisher,url,doi,notes,version) on public.book_sources to authenticated;
create policy sources_read on public.book_sources for select to authenticated using(public.has_book_access(book_id));
create policy sources_insert on public.book_sources for insert to authenticated with check(public.can_write_book(book_id) and created_by=auth.uid());
create policy sources_update on public.book_sources for update to authenticated using(public.can_write_book(book_id)) with check(public.can_write_book(book_id));
create function public.source_version_guard() returns trigger language plpgsql set search_path=public as $$begin if new.version<>old.version+1 then raise exception 'source version conflict' using errcode='40001';end if;return new;end;$$;
create trigger source_version before update on public.book_sources for each row execute function public.source_version_guard();
create table public.manuscript_citations(
 id uuid primary key,book_id uuid not null references public.books(id) on delete cascade,node_id uuid not null,block_id text not null,source_id uuid not null,locator text not null default '',
 foreign key(node_id,book_id) references public.manuscript_nodes(id,book_id) on delete cascade,
 foreign key(source_id,book_id) references public.book_sources(id,book_id)
);
alter table public.manuscript_citations enable row level security;
revoke all on public.manuscript_citations from anon,authenticated;
grant select on public.manuscript_citations to authenticated;
create policy citations_read on public.manuscript_citations for select to authenticated using(public.has_book_access(book_id));
create function public.index_manuscript_citations() returns trigger language plpgsql security definer set search_path=public as $$
declare paragraph jsonb;citation jsonb;
begin
 delete from public.manuscript_citations where node_id=new.id;
 for paragraph in select distinct value from jsonb_path_query(new.content,'$.** ? (@.type == "paragraph" || @.type == "heading")') as value loop
  for citation in select value from jsonb_array_elements(coalesce(paragraph->'content','[]')) as value where value->>'type'='citation' loop
   insert into public.manuscript_citations(id,book_id,node_id,block_id,source_id,locator) values((citation->'attrs'->>'citationId')::uuid,new.book_id,new.id,paragraph->'attrs'->>'blockId',(citation->'attrs'->>'sourceId')::uuid,coalesce(citation->'attrs'->>'locator',''));
  end loop;
 end loop;
 return new;
end;$$;
create trigger manuscript_citations_index after insert or update of content on public.manuscript_nodes for each row execute function public.index_manuscript_citations();
revoke all on function public.index_manuscript_citations() from public;
create or replace function public.freeze_publication(p_edition_id uuid,p_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare e public.editions;b public.books;nodes jsonb;assets jsonb;sources jsonb;release_id uuid;
begin
 select * into e from public.editions where id=p_edition_id for share;
 if e.id is null or not public.can_write_book(e.book_id) then raise exception 'publication denied' using errcode='42501';end if;
 select * into b from public.books where id=e.book_id for share;
 select (select coalesce(jsonb_agg(to_jsonb(n) order by n.position,n.id),'[]'::jsonb) from public.manuscript_nodes n where n.book_id=e.book_id),
        (select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]'::jsonb) from public.book_assets a where a.book_id=e.book_id),
        (select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at,s.id),'[]'::jsonb) from public.book_sources s where s.book_id=e.book_id)
 into nodes,assets,sources;
 if jsonb_array_length(nodes)=0 then raise exception 'manuscript is empty';end if;
 if coalesce(length(trim(e.config->>'author')),0)=0 then raise exception 'author is required';end if;
 if exists(select 1 from jsonb_array_elements(nodes) n where jsonb_array_length(n->'content'->'content')=0) then raise exception 'empty manuscript chapter';end if;
 insert into public.publication_releases(book_id,edition_id,name,payload,created_by)
 values(e.book_id,e.id,p_name,jsonb_build_object('schemaVersion',1,'rendererVersion','authorhub-1','frozenAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'book',to_jsonb(b),'edition',e.config,'nodes',nodes,'assets',assets,'sources',sources),auth.uid()) returning id into release_id;
 return release_id;
end;$$;

notify pgrst,'reload schema';
commit;
