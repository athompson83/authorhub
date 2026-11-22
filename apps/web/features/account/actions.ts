"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function signOutAction() {
  const db = await createClient();
  const { error } = await db.auth.signOut();
  if (error) return { error: "Unable to sign out. Try again." };
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
