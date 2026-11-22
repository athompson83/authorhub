\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000001','author@example.test'),('00000000-0000-4000-8000-000000000002','stranger@example.test'),('00000000-0000-4000-8000-000000000003','reader@example.test');
insert into public.books(id,organization_id,title,created_by) select '10000000-0000-4000-8000-000000000001',organization_id,'Textbook','00000000-0000-4000-8000-000000000001' from organization_memberships where user_id='00000000-0000-4000-8000-000000000001';
insert into book_memberships(book_id,user_id,role) values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','viewer');
insert into public.organization_memberships(organization_id,user_id,role) select organization_id,'00000000-0000-4000-8000-000000000003','member' from public.books where id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
insert into manuscript_nodes(id,book_id,kind,title,created_by,updated_by) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','chapter','Introduction',auth.uid(),auth.uid());
select save_manuscript_node('20000000-0000-4000-8000-000000000001',1,'{"version":1,"type":"doc","content":[{"type":"paragraph","attrs":{"blockId":"blk_1234567890123456"},"content":[{"type":"text","text":"Original textbook"}]}]}','[{"block_id":"blk_1234567890123456","block_type":"paragraph","ordinal":0,"text_content":"Original textbook"}]');
select snapshot_chapter('20000000-0000-4000-8000-000000000001','First draft');
insert into editions(id,book_id,name,config,created_by) values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Print','{"author":"Test Author"}',auth.uid());
select freeze_publication('30000000-0000-4000-8000-000000000001','Candidate');
do $$begin
 if (select count(*) from manuscript_revisions)<>2 then raise exception 'missing automatic history';end if;
 begin perform save_manuscript_node('20000000-0000-4000-8000-000000000001',1,'{}','[]');raise exception 'stale save succeeded';exception when serialization_failure then null;end;
end$$;
-- Restore old content as a new version; original history remains.
select save_manuscript_node('20000000-0000-4000-8000-000000000001',2,(select content from manuscript_revisions where version=1),'[]');
do $$begin
 if (select count(*) from manuscript_revisions)<>3 then raise exception 'restore removed history';end if;
 if not exists(select 1 from publication_releases where payload->'nodes'->0->'content'->'content'->0->'content'->0->>'text'='Original textbook') then raise exception 'release mutated';end if;
 begin update publication_releases set name='tampered';raise exception 'release update succeeded';exception when insufficient_privilege then null;end;
 begin update manuscript_revisions set title='tampered';raise exception 'history update succeeded';exception when insufficient_privilege then null;end;
end$$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$begin
 if exists(select 1 from publication_releases) or exists(select 1 from editions) or exists(select 1 from manuscript_revisions) then raise exception 'cross tenant read';end if;
 begin perform freeze_publication('30000000-0000-4000-8000-000000000001','Attack');raise exception 'cross tenant freeze';exception when insufficient_privilege then null;end;
 begin perform snapshot_chapter('20000000-0000-4000-8000-000000000001','Attack');raise exception 'cross tenant snapshot';exception when insufficient_privilege then null;end;
end$$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$begin
 if (select count(*) from publication_releases)<>1 then raise exception 'reader cannot read release';end if;
 begin perform save_manuscript_node('20000000-0000-4000-8000-000000000001',3,'{}','[]');raise exception 'reader write succeeded';exception when insufficient_privilege then null;end;
 begin perform freeze_publication('30000000-0000-4000-8000-000000000001','Attack');raise exception 'reader publish succeeded';exception when insufficient_privilege then null;end;
 update editions set name='attack',version=2;
 if found then raise exception 'reader edition edit succeeded';end if;
end$$;
rollback;
\echo 'Publishing database tests passed'
