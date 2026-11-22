import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DeletionControls,
  PendingDeletion,
} from "@/features/account/deletion-controls";
export default async function AccountPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: tasks } = await db
    .from("book_deletion_tasks")
    .select("id")
    .is("completed_at", null)
    .order("created_at");
  return (
    <section style={{ maxWidth: 700 }}>
      <h2>Account settings</h2>
      <p>{user.email}</p>
      <p>
        Export your work from each book’s Release tab before deleting it. A
        release backup can be imported into a new editable book from your
        library.
      </p>
      <Link href="/library">Open library</Link>
      {" · "}
      <Link href="/forgot-password">Change password</Link>
      {tasks?.map((task) => (
        <PendingDeletion key={task.id} id={task.id} />
      ))}
      <DeletionControls email={user.email ?? ""} />
    </section>
  );
}
