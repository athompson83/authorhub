import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookSettings } from "@/features/books/components/book-settings";
export default async function Settings({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params,
    db = await createClient();
  const [{ data: book }, { data: owner }] = await Promise.all([
    db
      .from("books")
      .select(
        "id,title,subtitle,audience,purpose,target_word_count,status,updated_at",
      )
      .eq("id", bookId)
      .single(),
    db.rpc("is_book_owner", { target_book_id: bookId }),
  ]);
  if (!book) notFound();
  return <BookSettings book={book} isOwner={!!owner} />;
}
