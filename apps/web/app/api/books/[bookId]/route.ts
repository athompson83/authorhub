import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("metadata"),
    updatedAt: z.string().datetime({ offset: true }),
    title: z.string().trim().min(1).max(200),
    subtitle: z.string().trim().max(240),
    audience: z.string().trim().max(500),
    purpose: z.string().trim().max(1000),
    targetWordCount: z.number().int().positive().max(500000).nullable(),
  }),
  z.object({
    action: z.literal("archive"),
    updatedAt: z.string().datetime({ offset: true }),
    status: z.enum(["active", "archived"]),
  }),
]);
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params,
    db = await createClient();
  if (!(await db.auth.getUser()).data.user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    if (input.action === "archive") {
      const { data: owner } = await db.rpc("is_book_owner", {
        target_book_id: bookId,
      });
      if (!owner)
        return NextResponse.json(
          { error: "Only the book owner can archive or restore it." },
          { status: 403 },
        );
    }
    const changes =
      input.action === "archive"
        ? { status: input.status }
        : {
            title: input.title,
            subtitle: input.subtitle || null,
            audience: input.audience || null,
            purpose: input.purpose || null,
            target_word_count: input.targetWordCount,
          };
    const { data, error } = await db
      .from("books")
      .update(changes)
      .eq("id", bookId)
      .eq("updated_at", input.updatedAt)
      .select("updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        {
          error: "This book changed elsewhere. Reload before saving settings.",
        },
        { status: 409 },
      );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to save book settings. Check the fields and your editing access.",
      },
      { status: 400 },
    );
  }
}
