import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateBookInput } from './schemas';

export interface BookSummary {
  id: string;
  title: string;
  subtitle: string | null;
  audience: string | null;
  purpose: string | null;
  target_word_count: number | null;
  status: 'active' | 'archived';
  updated_at: string;
}

export async function listBooks(client: SupabaseClient): Promise<BookSummary[]> {
  const { data, error } = await client
    .from('books')
    .select('id,title,subtitle,audience,purpose,target_word_count,status,updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as BookSummary[];
}

export async function createBook(
  client: SupabaseClient,
  userId: string,
  input: CreateBookInput,
): Promise<{ id: string }> {
  const { data: membership, error: membershipError } = await client
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (membershipError || !membership) {
    throw membershipError ?? new Error('No AuthorHub workspace is available for this account.');
  }

  const bookId = crypto.randomUUID();
  const { error } = await client
    .from('books')
    .insert({
      id: bookId,
      organization_id: membership.organization_id,
      title: input.title,
      subtitle: input.subtitle || null,
      audience: input.audience || null,
      purpose: input.purpose || null,
      target_word_count: input.targetWordCount ?? null,
      created_by: userId,
    });

  // RETURNING applies the SELECT policy before the AFTER owner-membership
  // trigger becomes visible. A client-generated UUID avoids relaxing RLS.
  if (error) throw error;
  return { id: bookId };
}
