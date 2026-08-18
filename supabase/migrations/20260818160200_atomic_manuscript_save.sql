begin;

create or replace function public.save_manuscript_node(
  p_node_id uuid,
  p_expected_version bigint,
  p_content jsonb,
  p_blocks jsonb
)
returns bigint
language plpgsql
set search_path = public
as $$
declare
  target_book_id uuid;
  next_version bigint;
begin
  if jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid manuscript content';
  end if;

  if jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'invalid manuscript block index';
  end if;

  update public.manuscript_nodes
  set
    content = p_content,
    content_version = content_version + 1,
    updated_by = auth.uid()
  where id = p_node_id
    and content_version = p_expected_version
  returning book_id, content_version into target_book_id, next_version;

  if target_book_id is null then
    raise exception 'manuscript version conflict' using errcode = '40001';
  end if;

  delete from public.manuscript_blocks where node_id = p_node_id;

  insert into public.manuscript_blocks (
    block_id,
    book_id,
    node_id,
    block_type,
    ordinal,
    text_content
  )
  select
    indexed.block_id,
    target_book_id,
    p_node_id,
    indexed.block_type,
    indexed.ordinal,
    indexed.text_content
  from jsonb_to_recordset(p_blocks) as indexed(
    block_id text,
    block_type text,
    ordinal integer,
    text_content text
  );

  return next_version;
end;
$$;

grant execute on function public.save_manuscript_node(uuid, bigint, jsonb, jsonb) to authenticated;

commit;
