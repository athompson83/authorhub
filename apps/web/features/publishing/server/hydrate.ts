import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { replaceAssetReferences } from "@/features/assets/references";
import type { Publication } from "../publication";
export async function hydratePublication(
  db: SupabaseClient,
  publication: Publication,
): Promise<Publication> {
  const references = new Set<string>();
  replaceAssetReferences(publication, (id) => {
    references.add(id);
    return `asset:${id}`;
  });
  const urls: Record<string, string> = {};
  for (const id of references) {
    const asset = publication.assets.find((a) => a.id === id);
    if (!asset || !asset.storage_path.startsWith(`${publication.book.id}/`))
      throw new Error("missing_frozen_asset");
    const { data, error } = await db.storage
      .from("book-assets")
      .download(asset.storage_path);
    if (error || !data) throw new Error("asset_unavailable");
    const bytes = Buffer.from(await data.arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
      throw new Error("asset_integrity_failure");
    urls[id] = `data:${asset.mime_type};base64,${bytes.toString("base64")}`;
  }
  return replaceAssetReferences(publication, (id) => urls[id]!);
}
