import { NextResponse } from "next/server";
import { z } from "zod";
import { manuscriptDocumentSchema } from "@authorhub/manuscript";
import { createClient } from "@/lib/supabase/server";
import { saveNodeContent } from "@/features/manuscript/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  const db = await createClient();
  if (!(await db.auth.getUser()).data.user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const [revisions, snapshots] = await Promise.all([
    db
      .from("manuscript_revisions")
      .select("id,version,title,created_at,content")
      .eq("node_id", nodeId)
      .order("version", { ascending: false })
      .limit(100),
    db
      .from("manuscript_snapshots")
      .select("id,name,created_at,payload")
      .eq("node_id", nodeId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (revisions.error || snapshots.error)
    return NextResponse.json(
      { error: "Unable to load history." },
      { status: 400 },
    );
  return NextResponse.json(
    { revisions: revisions.data, snapshots: snapshots.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("snapshot"),
    name: z.string().trim().min(1).max(200),
  }),
  z.object({
    action: z.literal("restore"),
    revisionId: z.string().uuid(),
    source: z.enum(["revision", "snapshot"]).default("revision"),
    version: z.number().int().positive(),
  }),
]);
export async function POST(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  const db = await createClient();
  if (!(await db.auth.getUser()).data.user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const input = actionSchema.parse(await request.json());
    if (input.action === "snapshot") {
      const { error } = await db.rpc("snapshot_chapter", {
        p_node_id: nodeId,
        p_name: input.name,
      });
      if (error) throw error;
    } else {
      const { data, error } = await db
        .from(
          input.source === "snapshot"
            ? "manuscript_snapshots"
            : "manuscript_revisions",
        )
        .select(input.source === "snapshot" ? "payload" : "content")
        .eq("id", input.revisionId)
        .eq("node_id", nodeId)
        .single();
      if (error || !data) throw new Error("Revision unavailable.");
      const version = await saveNodeContent(
        db,
        nodeId,
        input.version,
        manuscriptDocumentSchema.parse(
          input.source === "snapshot"
            ? (data as unknown as { payload: { content: unknown } }).payload
                .content
            : (data as unknown as { content: unknown }).content,
        ),
      );
      return NextResponse.json({ version });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const conflict =
      error instanceof Error && error.message === "VERSION_CONFLICT";
    return NextResponse.json(
      {
        error: conflict
          ? "Newer changes exist. Reload before restoring."
          : "Unable to update history.",
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
