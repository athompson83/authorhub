import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicationSchema } from "../publication";
import { artifactFormat, artifactTypes } from "../artifact-format";
import { renderArtifact } from "./render";
import { hydratePublication } from "./hydrate";
export async function processPublicationExport(
  db: SupabaseClient,
  jobId: string,
) {
  const { data: claims, error } = await db.rpc("claim_publication_export", {
    p_job_id: jobId,
  });
  if (error || !claims?.length) return;
  const job = claims[0] as {
    id: string;
    book_id: string;
    release_id: string;
    format: string;
    renderer_version: string;
    lease_token: string;
  };
  try {
    const format = artifactFormat.parse(job.format),
      type = artifactTypes[format];
    const path = `${job.book_id}/${job.release_id}/${job.renderer_version}/${format}.${type.extension}`;
    const bucket = db.storage.from("publication-artifacts");
    // A worker may have uploaded before a process interruption. Reuse those bytes;
    // never overwrite a stored artifact during retries.
    const { data: existing } = await bucket.download(path);
    let bytes: Uint8Array;
    if (existing) bytes = new Uint8Array(await existing.arrayBuffer());
    else {
      const { data: release, error: readError } = await db
        .from("publication_releases")
        .select("payload")
        .eq("id", job.release_id)
        .eq("book_id", job.book_id)
        .single();
      if (readError || !release) throw new Error("release_unavailable");
      bytes = await renderArtifact(
        await hydratePublication(db, publicationSchema.parse(release.payload)),
        job.release_id,
        format,
      );
      if (bytes.byteLength > 50 * 1024 * 1024)
        throw new Error("artifact_too_large");
      const { error: uploadError } = await bucket.upload(path, bytes, {
        contentType: type.mime,
        upsert: false,
      });
      if (uploadError) throw uploadError;
    }
    const { error: finishError } = await db.rpc("finish_publication_export", {
      p_job_id: job.id,
      p_lease_token: job.lease_token,
      p_path: path,
      p_sha256: createHash("sha256").update(bytes).digest("hex"),
      p_size: bytes.byteLength,
      p_mime: type.mime,
    });
    if (finishError) throw finishError;
  } catch (error) {
    await db.rpc("fail_publication_export", {
      p_job_id: job.id,
      p_lease_token: job.lease_token,
      p_error_code: error instanceof Error ? error.message : "render_failed",
    });
  }
}
