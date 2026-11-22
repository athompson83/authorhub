"use client";
import { useState } from "react";
export function ChapterSettings({
  nodeId,
  title,
  kind,
  version,
}: {
  nodeId: string;
  title: string;
  kind: string;
  version: number;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <details className="chapter-settings">
      <summary>Chapter title, type & order</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            !window.dispatchEvent(
              new Event("authorhub:before-action", { cancelable: true }),
            )
          ) {
            setMessage(
              "Wait for the draft to save, then reload before editing settings.",
            );
            return;
          }
          setBusy(true);
          const form = new FormData(e.currentTarget);
          try {
            const response = await fetch(
              `/api/manuscript/nodes/${nodeId}/structure`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  title: form.get("title"),
                  kind: form.get("kind"),
                  version,
                  direction: Number(form.get("direction")),
                }),
              },
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            window.location.reload();
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Unable to save.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Title
          <input name="title" defaultValue={title} maxLength={200} required />
        </label>
        <label>
          Type
          <select name="kind" defaultValue={kind}>
            {["front_matter", "part", "chapter", "section", "back_matter"].map(
              (k) => (
                <option key={k} value={k}>
                  {k.replace("_", " ")}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Order
          <select name="direction">
            <option value="0">Keep position</option>
            <option value="-1">Move earlier</option>
            <option value="1">Move later</option>
          </select>
        </label>
        <button className="button" disabled={busy}>
          Save chapter settings
        </button>
        <p role="status">{message}</p>
      </form>
      <p className="muted">
        Save your draft and reload before changing chapter settings.
      </p>
    </details>
  );
}
