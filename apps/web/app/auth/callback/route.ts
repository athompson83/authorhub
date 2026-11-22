import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code"),
    token = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  const db = await createClient();
  const result = code
    ? await db.auth.exchangeCodeForSession(code)
    : token && ["signup", "recovery", "invite", "email"].includes(type ?? "")
      ? await db.auth.verifyOtp({
          token_hash: token,
          type: type as EmailOtpType,
        })
      : { error: new Error("Missing confirmation code.") };
  const target =
    type === "recovery" || url.searchParams.get("recovery") === "1"
      ? "/reset-password"
      : "/library";
  return NextResponse.redirect(
    new URL(result.error ? "/sign-in?error=confirmation" : target, url.origin),
  );
}
