"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createBlockId,
  type ManuscriptBlock,
  type ManuscriptInline,
} from "@authorhub/manuscript";
import { createClient } from "@/lib/supabase/client";
import { publicationSchema } from "@/features/publishing/publication";
import { uploadBookImage } from "@/features/assets/upload";
export function ImportBook() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [importedId, setImportedId] = useState("");
  useEffect(() => {
    if (!busy) return;
    const click = (event: MouseEvent) => {
      if ((event.target as Element).closest("a[href]")) {
        event.preventDefault();
        setMessage("Wait for this import to finish before leaving the page.");
      }
    };
    document.addEventListener("click", click, true);
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigation = (event: Event) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    window.addEventListener("authorhub:before-action", navigation);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", guard);
      window.removeEventListener("authorhub:before-action", navigation);
    };
  }, [busy]);
  return (
    <details className="card" style={{ padding: 20, marginTop: 20 }}>
      <summary>Import a backup or text manuscript</summary>
      <p className="muted">
        A release backup restores a new editable book, including artwork and
        references. A text file imports as one chapter. Existing books remain
        intact.
      </p>
      <input
        type="file"
        aria-label="Import book file"
        accept="application/json,text/plain,.json,.txt"
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setMessage("Reading your manuscript…");
          setImportedId("");
          try {
            if (file.size > 200 * 1024 * 1024)
              throw new Error("Choose a backup smaller than 200 MB.");
            const text = await file.text(),
              backup = file.name.toLowerCase().endsWith(".json")
                ? publicationSchema.parse(JSON.parse(text))
                : null;
            const title =
              (backup?.book.title ?? file.name.replace(/\.txt$/i, "")).slice(
                0,
                200,
              ) || "Imported textbook";
            const response = await fetch("/api/books", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                title,
                subtitle: backup?.book.subtitle ?? undefined,
              }),
            });
            const created = await response.json();
            if (!response.ok) throw new Error(created.error);
            const bookId = String(created.id);
            setImportedId(bookId);
            const db = createClient(),
              {
                data: { user },
              } = await db.auth.getUser();
            if (!user) throw new Error("Sign in again to continue the import.");
            const sourceIds = new Map<string, string>(),
              imageIds = new Map<string, { id: string; reference: string }>();
            if (backup)
              for (const source of backup.sources) {
                const saved = await fetch(`/api/books/${bookId}/sources`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ source }),
                });
                const data = await saved.json();
                if (!saved.ok) throw new Error(data.error);
                sourceIds.set(source.id, data.id);
              }
            async function image(src: string) {
              if (!src) return "";
              if (imageIds.has(src)) return imageIds.get(src)!.reference;
              if (!src.startsWith("data:image/"))
                throw new Error(
                  "This backup does not contain its artwork bytes. Export a new release backup and try again.",
                );
              const blob = await (await fetch(src)).blob();
              const asset = await uploadBookImage(
                bookId,
                new File(
                  [blob],
                  `import.${blob.type === "image/png" ? "png" : "jpg"}`,
                  { type: blob.type },
                ),
              );
              imageIds.set(src, asset);
              return asset.reference;
            }
            async function rebuildInline(
              value: ManuscriptInline,
            ): Promise<ManuscriptInline> {
              const node = structuredClone(value);
              if (node.type === "footnote")
                node.attrs.noteId = crypto.randomUUID();
              if (node.type === "citation") {
                node.attrs.citationId = crypto.randomUUID();
                const sourceId = sourceIds.get(node.attrs.sourceId);
                if (!sourceId)
                  throw new Error(
                    "This backup contains a citation with no source.",
                  );
                node.attrs.sourceId = sourceId;
              }
              return node;
            }
            async function rebuildBlock(
              value: ManuscriptBlock,
            ): Promise<ManuscriptBlock> {
              const node = structuredClone(value);
              node.attrs.blockId = createBlockId();
              if (node.type === "image") {
                node.attrs.src = await image(node.attrs.src);
                node.attrs.assetId = node.attrs.src.slice(6);
                return node;
              }
              if (node.type === "blockMath" || node.type === "codeBlock")
                return node;
              if (node.type === "paragraph" || node.type === "heading") {
                if (node.content)
                  node.content = await Promise.all(
                    node.content.map(rebuildInline),
                  );
                return node;
              }
              node.content = await Promise.all(node.content.map(rebuildBlock));
              return node;
            }
            const chapters = backup?.nodes ?? [
              {
                title: "Imported manuscript",
                kind: "chapter",
                content: {
                  version: 1 as const,
                  type: "doc" as const,
                  content: text
                    .split(/\r?\n/)
                    .filter((line) => line.trim())
                    .map((line) => ({
                      type: "paragraph" as const,
                      attrs: { blockId: createBlockId() },
                      content: [{ type: "text" as const, text: line }],
                    })),
                },
              },
            ];
            for (let index = 0; index < chapters.length; index++) {
              setMessage(
                `Importing chapter ${index + 1} of ${chapters.length}…`,
              );
              const node = chapters[index]!,
                nodeId = crypto.randomUUID();
              const { error } = await db
                .from("manuscript_nodes")
                .insert({
                  id: nodeId,
                  book_id: bookId,
                  kind: node.kind,
                  title: node.title,
                  position: (index + 1) * 1000,
                  created_by: user.id,
                  updated_by: user.id,
                });
              if (error)
                throw new Error(
                  "A chapter could not be created. Your partial import is preserved.",
                );
              const content = {
                ...node.content,
                content: await Promise.all(
                  node.content.content.map(rebuildBlock),
                ),
              };
              const saved = await fetch(`/api/manuscript/nodes/${nodeId}`, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ version: 1, content }),
              });
              if (!saved.ok)
                throw new Error(
                  "A chapter could not be saved. Your partial import is preserved.",
                );
            }
            if (backup) {
              const config = {
                ...backup.edition,
                coverImage: await image(backup.edition.coverImage),
                backImage: await image(backup.edition.backImage),
              };
              const saved = await fetch(`/api/books/${bookId}/publishing`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action: "save", config }),
              });
              if (!saved.ok)
                throw new Error(
                  "Chapters imported, but edition settings could not be restored.",
                );
            }
            setMessage(
              "Import complete. Open the imported book to review and continue writing.",
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Import failed. Any saved chapters remain available.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      <p role="status">{message}</p>
      {importedId && (
        <Link className="button" href={`/books/${importedId}`}>
          Open imported book
        </Link>
      )}
    </details>
  );
}
