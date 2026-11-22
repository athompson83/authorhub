import { createClient } from "@/lib/supabase/client";
export async function uploadBookImage(bookId: string, file: File) {
  if (
    !["image/png", "image/jpeg"].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error("Choose a PNG or JPEG under 20 MB.");
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  bitmap.close();
  const db = createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  if (!user) throw new Error("Sign in before uploading artwork.");
  const id = crypto.randomUUID(),
    path = `${bookId}/${id}.${file.type === "image/png" ? "png" : "jpg"}`;
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const { error } = await db.storage
    .from("book-assets")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("Artwork upload failed. Try again.");
  const { error: metadataError } = await db
    .from("book_assets")
    .insert({
      id,
      book_id: bookId,
      storage_path: path,
      mime_type: file.type,
      width,
      height,
      size_bytes: file.size,
      sha256: hash,
      created_by: user.id,
    });
  if (metadataError) throw new Error("Artwork could not be saved. Try again.");
  const { data: signed, error: signError } = await db.storage
    .from("book-assets")
    .createSignedUrl(path, 3600);
  if (signError || !signed)
    throw new Error("Artwork preview unavailable. Reload to try again.");
  return { id, reference: `asset:${id}`, url: signed.signedUrl, width, height };
}
