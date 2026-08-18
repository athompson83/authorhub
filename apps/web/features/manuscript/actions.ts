'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createChapter } from './repository';

export async function createChapterAction(bookId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  if (!title || title.length > 200) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const chapter = await createChapter(supabase, user.id, bookId, title);
  revalidatePath(`/books/${bookId}`);
  redirect(`/books/${bookId}?node=${chapter.id}`);
}
