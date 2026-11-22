"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookSource } from "./schema";
export function SourceLibrary({
  bookId,
  sources,
}: {
  bookId: string;
  sources: BookSource[];
}) {
  const router = useRouter(),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const current = sources.find((source) => source.id === selected);
  return (
    <details className="history-panel">
      <summary>Source library & references ({sources.length})</summary>
      <p className="muted">
        Record the source details you have verified. Insert a citation from the
        editor; references are generated from the sources actually cited.
      </p>
      <label>
        Edit source
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">New source</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.title}
            </option>
          ))}
        </select>
      </label>
      <form
        key={selected}
        className="source-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            !window.dispatchEvent(
              new Event("authorhub:before-action", { cancelable: true }),
            )
          ) {
            setMessage("Wait for your draft to save first.");
            return;
          }
          setBusy(true);
          const form = new FormData(event.currentTarget);
          try {
            const source = Object.fromEntries(
              [
                "title",
                "author",
                "year",
                "publisher",
                "url",
                "doi",
                "notes",
              ].map((key) => [key, String(form.get(key) ?? "")]),
            );
            const response = await fetch(`/api/books/${bookId}/sources`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                id: current?.id,
                version: current?.version,
                source,
              }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setMessage(
              "Source saved. It is now available in the citation selector.",
            );
            router.refresh();
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Source could not be saved.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            "title",
            "author",
            "year",
            "publisher",
            "url",
            "doi",
            "notes",
          ] as const
        ).map((key) => (
          <label key={key}>
            {
              {
                title: "Source title",
                author: "Source author",
                year: "Publication year",
                publisher: "Source publisher",
                url: "Source URL",
                doi: "DOI",
                notes: "Research notes",
              }[key]
            }
            {key === "notes" ? (
              <textarea
                name={key}
                defaultValue={current?.[key] ?? ""}
                rows={3}
              />
            ) : (
              <input
                name={key}
                type={key === "url" ? "url" : "text"}
                required={key === "title"}
                defaultValue={current?.[key] ?? ""}
              />
            )}
          </label>
        ))}
        <button className="button" disabled={busy}>
          Save source
        </button>
      </form>
      <p role="status">{message}</p>
    </details>
  );
}
