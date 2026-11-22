"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookSummary } from "../repository";
import { DeletionControls } from "@/features/account/deletion-controls";
export function BookSettings({
  book,
  isOwner,
}: {
  book: BookSummary;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState(book.updated_at),
    [savedTitle, setSavedTitle] = useState(book.title),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function update(body: object) {
    setBusy(true);
    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, updatedAt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUpdatedAt(data.updated_at);
      if ("title" in body && typeof body.title === "string")
        setSavedTitle(body.title.trim());
      setMessage("Book settings saved.");
      if ("status" in body) {
        router.replace(
          body.status === "archived" ? "/library?status=archived" : "/library",
        );
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save settings.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section style={{ maxWidth: 700 }}>
      <Link href={`/books/${book.id}`}>← Manuscript</Link>
      <h2>Book settings</h2>
      <form
        className="studio-fields"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void update({
            action: "metadata",
            title: String(data.get("title")),
            subtitle: String(data.get("subtitle")),
            audience: String(data.get("audience")),
            purpose: String(data.get("purpose")),
            targetWordCount: data.get("targetWordCount")
              ? Number(data.get("targetWordCount"))
              : null,
          });
        }}
      >
        {(["title", "subtitle", "audience", "purpose"] as const).map((key) => (
          <label key={key} className="field">
            {
              {
                title: "Book title",
                subtitle: "Subtitle",
                audience: "Audience",
                purpose: "Purpose",
              }[key]
            }
            <input
              name={key}
              defaultValue={book[key] ?? ""}
              required={key === "title"}
              maxLength={
                key === "purpose"
                  ? 1000
                  : key === "audience"
                    ? 500
                    : key === "subtitle"
                      ? 240
                      : 200
              }
            />
          </label>
        ))}
        <label className="field">
          Word target
          <input
            name="targetWordCount"
            type="number"
            min={1}
            max={500000}
            defaultValue={book.target_word_count ?? ""}
          />
        </label>
        <button className="button primary" disabled={busy}>
          Save book settings
        </button>
      </form>
      <p role="status">{message}</p>
      {isOwner && (
        <section className="inspector-section">
          <h3>
            {book.status === "active"
              ? "Archive this book"
              : "Restore this book"}
          </h3>
          <p className="muted">
            Archiving keeps your chapters, history, artwork and releases. You
            can restore the book from the archived library.
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              void update({
                action: "archive",
                status: book.status === "active" ? "archived" : "active",
              })
            }
          >
            {book.status === "active" ? "Archive book" : "Restore book"}
          </button>
        </section>
      )}
      {isOwner && (
        <DeletionControls book={{ id: book.id, title: savedTitle }} />
      )}
    </section>
  );
}
