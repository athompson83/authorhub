'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createBook } from './repository';
import { createBookSchema } from './schemas';

export interface BookActionState {
  error?: string;
}

export async function createBookAction(
  _previousState: BookActionState,
  formData: FormData,
): Promise<BookActionState> {
  const parsed = createBookSchema.safeParse({
    title: formData.get('title'),
    subtitle: formData.get('subtitle') || undefined,
    audience: formData.get('audience') || undefined,
    purpose: formData.get('purpose') || undefined,
    targetWordCount: formData.get('targetWordCount') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the book details and try again.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  let book: { id: string };
  try {
    book = await createBook(supabase, user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to create book.' };
  }

  revalidatePath('/library');
  redirect(`/books/${book.id}`);
}
