import type { SupabaseClient } from "@supabase/supabase-js";
export async function bookAssetUrls(db: SupabaseClient, bookId: string) {
  const { data: assets, error } = await db
    .from("book_assets")
    .select("id,storage_path")
    .eq("book_id", bookId);
  if (error) throw new Error("Artwork could not be loaded.");
  if (!assets?.length) return {} as Record<string, string>;
  const { data: signed, error: signError } = await db.storage
    .from("book-assets")
    .createSignedUrls(
      assets.map((a) => a.storage_path),
      3600,
    );
  if (signError) throw new Error("Artwork previews could not be loaded.");
  return Object.fromEntries(
    assets.map((a) => [
      a.id,
      signed?.find((s) => s.path === a.storage_path)?.signedUrl ?? "",
    ]),
  );
}
