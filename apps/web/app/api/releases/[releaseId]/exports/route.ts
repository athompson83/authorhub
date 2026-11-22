import { after, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  artifactFormat,
  artifactTypes,
} from "@/features/publishing/artifact-format";
import { processPublicationExport } from "@/features/publishing/server/worker";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ releaseId: string }> },
) {
  const { releaseId } = await params,
    db = await createClient();
  if (!(await db.auth.getUser()).data.user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const { format } = z
      .object({ format: artifactFormat })
      .parse(await request.json());
    const { data: jobId, error } = await db.rpc("request_publication_export", {
      p_release_id: releaseId,
      p_format: format,
    });
    if (error) throw error;
    after(async () => {
      await processPublicationExport(db, jobId);
    });
    return NextResponse.json({ jobId }, { status: 202 });
  } catch {
    return NextResponse.json(
      { error: "Unable to start export. Check editing access and try again." },
      { status: 400 },
    );
  }
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ releaseId: string }> },
) {
  const { releaseId } = await params,
    db = await createClient();
  if (!(await db.auth.getUser()).data.user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const jobId = new URL(request.url).searchParams.get("job");
  if (!jobId)
    return NextResponse.json({ error: "Export ID required." }, { status: 400 });
  const { data: job, error } = await db
    .from("publication_export_jobs")
    .select("id,status,format,attempts,error_code,leased_at")
    .eq("id", jobId)
    .eq("release_id", releaseId)
    .single();
  if (error || !job)
    return NextResponse.json({ error: "Export unavailable." }, { status: 404 });
  if (job.status !== "succeeded")
    return NextResponse.json(
      {
        status: job.status,
        attempts: job.attempts,
        error:
          job.attempts >= 3
            ? "This export failed three times. Freeze a new publication copy to start a fresh export."
            : job.error_code === "artifact_too_large"
              ? "This export exceeds the 50 MB file limit. Reduce image sizes or split the book before exporting."
              : job.error_code
                ? "Export generation failed. Retry to resume safely."
                : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  const { data: file } = await db
    .from("edition_files")
    .select("storage_path,sha256,size_bytes")
    .eq("job_id", job.id)
    .single();
  if (!file)
    return NextResponse.json(
      { error: "Stored artifact unavailable." },
      { status: 500 },
    );
  const format = artifactFormat.parse(job.format),
    filename = `authorhub-${releaseId}-${format}.${artifactTypes[format].extension}`;
  const { data: signed, error: signError } = await db.storage
    .from("publication-artifacts")
    .createSignedUrl(file.storage_path, 120, { download: filename });
  if (signError || !signed)
    return NextResponse.json(
      { error: "Unable to create download." },
      { status: 500 },
    );
  return NextResponse.json(
    {
      status: "succeeded",
      url: signed.signedUrl,
      filename,
      sha256: file.sha256,
      size: file.size_bytes,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
