import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sourceInputSchema } from "@/features/references/schema";
const schema = z.object({
  id: z.string().uuid().optional(),
  version: z.number().int().positive().optional(),
  source: sourceInputSchema,
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params,
    db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const query = input.id
      ? db
          .from("book_sources")
          .update({ ...input.source, version: (input.version ?? 0) + 1 })
          .eq("id", input.id)
          .eq("book_id", bookId)
          .eq("version", input.version ?? 0)
      : db
          .from("book_sources")
          .insert({ ...input.source, book_id: bookId, created_by: user.id });
    const { data, error } = await query.select("id,version").maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { error: "This source changed elsewhere. Reload before saving." },
        { status: 409 },
      );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Check the source title and URL."
            : "Unable to save this source. Check editing access and try again.",
      },
      { status: 400 },
    );
  }
}
