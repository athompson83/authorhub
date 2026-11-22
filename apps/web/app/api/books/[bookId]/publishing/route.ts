import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { editionSchema } from "@/features/publishing/schema";
import {
  publicationSchema,
  readiness,
} from "@/features/publishing/publication";
const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    id: z.string().uuid().optional(),
    version: z.number().int().positive().optional(),
    config: editionSchema,
  }),
  z.object({
    action: z.literal("freeze"),
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
  }),
]);
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const input = inputSchema.parse(await request.json());
    if (input.action === "save") {
      const row = { name: input.config.name, config: input.config };
      const query = input.id
        ? db
            .from("editions")
            .update({ ...row, version: (input.version ?? 0) + 1 })
            .eq("id", input.id)
            .eq("book_id", bookId)
            .eq("version", input.version ?? 0)
        : db
            .from("editions")
            .insert({ ...row, book_id: bookId, created_by: user.id });
      const { data, error } = await query.select("id,version").maybeSingle();
      if (error) throw error;
      if (!data)
        return NextResponse.json(
          {
            error:
              "Edition changed elsewhere or you do not have editing access. Reload before saving.",
          },
          { status: 409 },
        );
      return NextResponse.json(data);
    }
    const { data: edition, error } = await db
      .from("editions")
      .select("config")
      .eq("id", input.id)
      .eq("book_id", bookId)
      .single();
    if (error || !edition) throw new Error("Edition unavailable.");
    const { data: book } = await db
      .from("books")
      .select("id,title,subtitle")
      .eq("id", bookId)
      .single();
    const { data: nodes } = await db
      .from("manuscript_nodes")
      .select("*")
      .eq("book_id", bookId)
      .order("position");
    const { data: sources } = await db
      .from("book_sources")
      .select("*")
      .eq("book_id", bookId);
    const preflight = readiness(
      publicationSchema.parse({
        schemaVersion: 1,
        rendererVersion: "authorhub-1",
        book,
        edition: edition.config,
        nodes,
        sources: sources ?? [],
      }),
    );
    if (preflight.blockers.length)
      return NextResponse.json(
        { error: preflight.blockers.join(" ") },
        { status: 400 },
      );
    const { data: releaseId, error: freezeError } = await db.rpc(
      "freeze_publication",
      { p_edition_id: input.id, p_name: input.name },
    );
    if (freezeError) throw freezeError;
    return NextResponse.json({ id: releaseId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues.map((i) => i.message).join(" ")
            : "Unable to save publication settings. Check your access and try again.",
      },
      { status: 400 },
    );
  }
}
