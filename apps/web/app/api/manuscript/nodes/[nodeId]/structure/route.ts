import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
const schema = z.object({
  title: z.string().trim().min(1).max(200),
  kind: z.enum(["front_matter", "part", "chapter", "section", "back_matter"]),
  version: z.number().int().positive(),
  direction: z.number().int().min(-1).max(1),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params,
    db = await createClient();
  if (!(await db.auth.getUser()).data.user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const { error } = await db.rpc("edit_manuscript_structure", {
      p_node_id: nodeId,
      p_version: input.version,
      p_title: input.title,
      p_kind: input.kind,
      p_direction: input.direction,
    });
    if (error)
      return NextResponse.json(
        {
          error:
            error.code === "40001"
              ? "Newer changes exist. Reload before changing structure."
              : "Unable to update chapter.",
        },
        { status: error.code === "40001" ? 409 : 400 },
      );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid chapter settings." },
      { status: 400 },
    );
  }
}
