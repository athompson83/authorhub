import type { SupabaseClient } from '@supabase/supabase-js';
import { manuscriptDocumentSchema, type ManuscriptDocument } from '@authorhub/manuscript';

export interface BookWorkspace {
  id: string;
  title: string;
  subtitle: string | null;
  audience: string | null;
  purpose: string | null;
  targetWordCount: number | null;
}

export interface ManuscriptNode {
  id: string;
  bookId: string;
  parentId: string | null;
  kind: 'front_matter' | 'part' | 'chapter' | 'section' | 'back_matter';
  title: string;
  position: number;
  content: ManuscriptDocument;
  contentVersion: number;
  updatedAt: string;
}

export async function getBookWorkspace(client: SupabaseClient, bookId: string): Promise<BookWorkspace> {
  const { data, error } = await client
    .from('books')
    .select('id,title,subtitle,audience,purpose,target_word_count')
    .eq('id', bookId)
    .single();

  if (error || !data) throw error ?? new Error('Book not found.');
  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle,
    audience: data.audience,
    purpose: data.purpose,
    targetWordCount: data.target_word_count,
  };
}

export async function listManuscriptNodes(client: SupabaseClient, bookId: string): Promise<ManuscriptNode[]> {
  const { data, error } = await client
    .from('manuscript_nodes')
    .select('id,book_id,parent_id,kind,title,position,content,content_version,updated_at')
    .eq('book_id', bookId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    bookId: row.book_id,
    parentId: row.parent_id,
    kind: row.kind,
    title: row.title,
    position: Number(row.position),
    content: manuscriptDocumentSchema.parse(row.content),
    contentVersion: Number(row.content_version),
    updatedAt: row.updated_at,
  }));
}

export async function createChapter(
  client: SupabaseClient,
  userId: string,
  bookId: string,
  title: string,
): Promise<{ id: string }> {
  const { data: latest } = await client
    .from('manuscript_nodes')
    .select('position')
    .eq('book_id', bookId)
    .is('parent_id', null)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = latest ? Number(latest.position) + 1000 : 1000;
  const { data, error } = await client
    .from('manuscript_nodes')
    .insert({
      book_id: bookId,
      parent_id: null,
      kind: 'chapter',
      title,
      position,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single();

  if (error || !data) throw error ?? new Error('Unable to create chapter.');
  return data as { id: string };
}

export async function saveNodeContent(
  client: SupabaseClient,
  userId: string,
  nodeId: string,
  expectedVersion: number,
  content: ManuscriptDocument,
): Promise<number> {
  const validated = manuscriptDocumentSchema.parse(content);
  const nextVersion = expectedVersion + 1;

  const { data, error } = await client
    .from('manuscript_nodes')
    .update({ content: validated, content_version: nextVersion, updated_by: userId })
    .eq('id', nodeId)
    .eq('content_version', expectedVersion)
    .select('content_version')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('VERSION_CONFLICT');
  return Number(data.content_version);
}
