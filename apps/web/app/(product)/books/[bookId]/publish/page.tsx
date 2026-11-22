import { bookAssetUrls } from "@/features/assets/server";
import { sourceSchema } from "@/features/references/schema";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Studio } from "@/features/publishing/studio";
export default async function PublishPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params,
    db = await createClient();
  const [book, nodes, editions, releases] = await Promise.all([
    db.from("books").select("id,title,subtitle").eq("id", bookId).single(),
    db
      .from("manuscript_nodes")
      .select("id,title,kind,position,content_version,content")
      .eq("book_id", bookId)
      .order("position")
      .order("id"),
    db
      .from("editions")
      .select("id,name,version,config")
      .eq("book_id", bookId)
      .order("updated_at", { ascending: false }),
    db
      .from("publication_releases")
      .select("id,name,created_at,payload")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false }),
  ]);
  if (!book.data) notFound();
  if (nodes.error || editions.error || releases.error)
    throw new Error(
      "Publication studio could not load. Check database migrations.",
    );
  const { data: sourceRows, error: sourceError } = await db
    .from("book_sources")
    .select("*")
    .eq("book_id", bookId);
  if (sourceError) throw new Error("Sources could not be loaded.");
  const sources = sourceSchema.array().parse(sourceRows ?? []);
  const assetUrls = await bookAssetUrls(db, bookId);
  return (
    <Studio
      sources={sources}
      initialAssetUrls={assetUrls}
      book={book.data}
      nodes={nodes.data ?? []}
      editions={editions.data ?? []}
      releases={releases.data ?? []}
    />
  );
}
