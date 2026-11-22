"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeletionControls({
  book,
  email,
}: {
  book?: { id: string; title: string };
  email?: string;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <section className="inspector-section">
      <h3>{book ? "Permanently delete this book" : "Delete your account"}</h3>
      <p className="muted">
        {book
          ? "This permanently removes the manuscript, history, sources, editions, releases and private artwork for every collaborator. Download a release backup first. Archive the book if you may need it again."
          : "First download backups and delete or transfer your owned books. Shared workspaces must retain another owner. Your sign-in and personal workspace will be removed; anonymous attribution remains in collaborators’ revision history."}
      </p>
      <form
        className="studio-fields"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          if (
            !window.dispatchEvent(
              new Event("authorhub:before-action", { cancelable: true }),
            )
          )
            return;
          setBusy(true);
          setMessage("");
          try {
            const db = createClient();
            if (!book) {
              const { error } = await db.auth.signInWithPassword({
                email: email!,
                password: String(form.get("password")),
              });
              if (error) throw new Error("Password verification failed.");
            }
            const { data, error } = await db.functions.invoke(
              "account-lifecycle",
              {
                body: {
                  action: book ? "book" : "account",
                  bookId: book?.id,
                  confirmation: String(form.get("confirmation")),
                },
              },
            );
            if (error) {
              const detail = await error.context?.json?.().catch(() => null);
              throw new Error(
                detail?.error ?? "Unable to finish deletion. Try again.",
              );
            }
            if (data?.error) throw new Error(data.error);
            if (!book) {
              await db.auth.signOut({ scope: "local" });
              // A full navigation discards cached private server-component payloads.
              window.location.replace("/sign-in");
            } else {
              router.replace(
                data.cleanupPending ? "/account?cleanup=pending" : "/library",
              );
              router.refresh();
            }
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Unable to finish deletion.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {!book && (
          <label className="field">
            Current password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
        )}
        <label className="field">
          Type {book ? `“${book.title}”` : "DELETE MY ACCOUNT"} to confirm
          <input name="confirmation" required autoComplete="off" />
        </label>
        <button className="button" disabled={busy}>
          {busy
            ? "Deleting…"
            : book
              ? "Permanently delete book"
              : "Permanently delete account"}
        </button>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}

export function PendingDeletion({ id }: { id: string }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div>
      <p>The book has been removed. Private file cleanup needs to finish.</p>
      <button
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { data, error } = await createClient().functions.invoke(
              "account-lifecycle",
              { body: { action: "cleanup", taskId: id } },
            );
            if (error || data?.error || data?.cleanupPending)
              throw new Error("Cleanup is still pending. Please retry.");
            setMessage("Private files removed.");
            router.refresh();
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Cleanup is still pending.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        Retry private file cleanup
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
