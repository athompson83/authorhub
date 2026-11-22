import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBookSchema } from "@/features/books/schemas";
import { createBook } from "@/features/books/repository";
export async function POST(request: Request) {
  const db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const input = createBookSchema.parse(await request.json());
    return NextResponse.json(await createBook(db, user.id, input));
  } catch {
    return NextResponse.json(
      { error: "Unable to create this book. Check the title and try again." },
      { status: 400 },
    );
  }
}
