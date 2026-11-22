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
-- Private artwork identities cannot be rewritten or referenced across books.
insert into storage.objects(bucket_id,name) values('book-assets','10000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001.png');
insert into public.book_assets(id,book_id,storage_path,mime_type,width,height,size_bytes,sha256,created_by) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001.png','image/png',160,120,359,repeat('a',64),auth.uid());
do $$begin
 if not exists(select 1 from book_assets) then raise exception 'author cannot read artwork';end if;
 begin update book_assets set sha256=repeat('b',64);raise exception 'artwork metadata mutable';exception when insufficient_privilege then null;end;
 begin perform save_manuscript_node('20000000-0000-4000-8000-000000000001',3,'{"version":1,"type":"doc","content":[{"type":"image","attrs":{"blockId":"blk_assettest1234567890","src":"asset:40000000-0000-4000-8000-000000000099","alt":"Missing artwork"}}]}','[]');raise exception 'invalid artwork accepted';exception when raise_exception then if sqlerrm='invalid artwork accepted' then raise;end if;end;
end$$;
-- Citations are derived from canonical content and bound to a source in this book.
insert into public.book_sources(id,book_id,title,author,year,created_by) values('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Verified textbook source','Original author','2026',auth.uid());
select save_manuscript_node('20000000-0000-4000-8000-000000000001',3,'{"version":1,"type":"doc","content":[{"type":"paragraph","attrs":{"blockId":"blk_citationparagraph0001"},"content":[{"type":"citation","attrs":{"citationId":"60000000-0000-4000-8000-000000000001","sourceId":"50000000-0000-4000-8000-000000000001","locator":"p. 12"}}]}]}','[]');
do $$declare released uuid;begin
 if (select count(*) from manuscript_citations)<>1 then raise exception 'citation projection missing';end if;
 released:=freeze_publication('30000000-0000-4000-8000-000000000001','Cited edition');
 update book_sources set author='Revised author',version=2 where id='50000000-0000-4000-8000-000000000001';
 if (select payload->'sources'->0->>'author' from publication_releases where id=released)<>'Original author' then raise exception 'frozen source metadata changed';end if;
 begin perform save_manuscript_node('20000000-0000-4000-8000-000000000001',4,'{"version":1,"type":"doc","content":[{"type":"paragraph","attrs":{"blockId":"blk_citationparagraph0001"},"content":[{"type":"citation","attrs":{"citationId":"60000000-0000-4000-8000-000000000001","sourceId":"50000000-0000-4000-8000-000000000099","locator":""}}]}]}','[]');raise exception 'missing citation source accepted';exception when foreign_key_violation then null;end;
end$$;
-- Export requests are idempotent, leases exclusive, and stored results immutable.
do $$declare release_id uuid; first_job uuid; second_job uuid; lease uuid; path text;begin
 select id into release_id from publication_releases limit 1;
 first_job:=request_publication_export(release_id,'interior_pdf');
 second_job:=request_publication_export(release_id,'interior_pdf');
 if first_job<>second_job then raise exception 'duplicate export jobs';end if;
 select lease_token into lease from claim_publication_export(first_job);
 if lease is null or exists(select 1 from claim_publication_export(first_job)) then raise exception 'lease was not exclusive';end if;
 path:='10000000-0000-4000-8000-000000000001/'||release_id::text||'/authorhub-server-2/interior_pdf.pdf';
 insert into storage.objects(bucket_id,name) values('publication-artifacts',path);
 if not exists(select 1 from storage.objects where name=path) then raise exception 'author cannot read artifact';end if;
 begin perform finish_publication_export(first_job,gen_random_uuid(),path,repeat('a',64),100,'application/pdf');raise exception 'wrong lease completed';exception when insufficient_privilege then null;end;
 perform finish_publication_export(first_job,lease,path,repeat('a',64),100,'application/pdf');
 if (select status from publication_export_jobs where id=first_job)<>'succeeded' then raise exception 'job did not finish';end if;
 begin update edition_files set sha256=repeat('b',64);raise exception 'artifact metadata mutable';exception when insufficient_privilege then null;end;
 update storage.objects set name=name||'.changed';if found then raise exception 'artifact bytes overwrite allowed';end if;
end$$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$begin
 if exists(select 1 from book_sources) or exists(select 1 from manuscript_citations) or exists(select 1 from book_assets) or exists(select 1 from edition_files) or exists(select 1 from storage.objects) or exists(select 1 from publication_releases) or exists(select 1 from editions) or exists(select 1 from manuscript_revisions) then raise exception 'cross tenant read';end if;
 begin perform freeze_publication('30000000-0000-4000-8000-000000000001','Attack');raise exception 'cross tenant freeze';exception when insufficient_privilege then null;end;
 begin perform snapshot_chapter('20000000-0000-4000-8000-000000000001','Attack');raise exception 'cross tenant snapshot';exception when insufficient_privilege then null;end;
end$$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$begin
 if (select count(*) from publication_releases)<>2 then raise exception 'reader cannot read releases';end if;
 begin perform save_manuscript_node('20000000-0000-4000-8000-000000000001',3,'{}','[]');raise exception 'reader write succeeded';exception when insufficient_privilege then null;end;
 begin perform freeze_publication('30000000-0000-4000-8000-000000000001','Attack');raise exception 'reader publish succeeded';exception when insufficient_privilege then null;end;
 update editions set name='attack',version=2;
 if found then raise exception 'reader edition edit succeeded';end if;
end$$;
-- Permanent removal is owner-only, typed, and preserves a private cleanup task.
do $$begin
 begin perform request_book_deletion('10000000-0000-4000-8000-000000000001','Textbook');raise exception 'viewer deleted book';exception when insufficient_privilege then null;end;
end$$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$declare task uuid;begin
 begin delete from books;raise exception 'direct delete bypassed cleanup';exception when insufficient_privilege then null;end;
 begin perform prepare_account_deletion('DELETE MY ACCOUNT');raise exception 'account owning books removed';exception when invalid_parameter_value then null;end;
 begin perform request_book_deletion('10000000-0000-4000-8000-000000000001','Wrong title');raise exception 'wrong confirmation deleted book';exception when invalid_parameter_value then null;end;
 task:=request_book_deletion('10000000-0000-4000-8000-000000000001','Textbook');
 if exists(select 1 from books) or exists(select 1 from manuscript_nodes) or exists(select 1 from publication_releases) or exists(select 1 from manuscript_citations) then raise exception 'book deletion left content';end if;
 if not exists(select 1 from book_deletion_tasks where id=task and completed_at is null) then raise exception 'missing durable cleanup task';end if;
 begin perform prepare_account_deletion('DELETE MY ACCOUNT');raise exception 'pending cleanup bypassed';exception when invalid_parameter_value then null;end;
end$$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$begin if exists(select 1 from book_deletion_tasks) then raise exception 'other account saw cleanup tasks';end if;end$$;
reset role;
update book_deletion_tasks set completed_at=now();
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$begin
 begin perform prepare_account_deletion('DELETE MY ACCOUNT');raise exception 'shared workspace orphaned';exception when invalid_parameter_value then null;end;
end$$;
reset role;
delete from organization_memberships where user_id='00000000-0000-4000-8000-000000000003' and role='member';
set local role authenticated;
select prepare_account_deletion('DELETE MY ACCOUNT');
do $$begin if exists(select 1 from organization_memberships where user_id=auth.uid()) then raise exception 'account membership remains';end if;end$$;
rollback;
\echo 'Publishing database tests passed'
