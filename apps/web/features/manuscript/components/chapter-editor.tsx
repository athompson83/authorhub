"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Mathematics } from "@tiptap/extension-mathematics";
import "katex/dist/katex.min.css";
import { Footnote, Citation } from "../academic-extensions";
import type { BookSource } from "@/features/references/schema";
import { uploadBookImage } from "@/features/assets/upload";
import { canonicalizeEditorImages } from "@/features/assets/references";
import { TableKit } from "@tiptap/extension-table";
import {
  createBlockId,
  ensureStableBlockIds,
  type ManuscriptDocument,
} from "@authorhub/manuscript";
import { toEditorContent } from "../editor-content";
import { Autosave } from "../autosave";
import { reidentifyPaste } from "../paste";
const StableBlocks = Extension.create({
  name: "stableBlocks",
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "blockMath",
          "bulletList",
          "orderedList",
          "listItem",
          "codeBlock",
          "image",
          "table",
          "tableRow",
          "tableCell",
          "tableHeader",
        ],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attrs) =>
              attrs.blockId ? { "data-block-id": attrs.blockId as string } : {},
          },
        },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((t) => t.docChanged)) return null;
          const tr = state.tr,
            seen = new Set<string>();
          state.doc.descendants((node, pos) => {
            if (
              ![
                "paragraph",
                "heading",
                "blockquote",
                "blockMath",
                "bulletList",
                "orderedList",
                "listItem",
                "codeBlock",
                "image",
                "table",
                "tableRow",
                "tableCell",
                "tableHeader",
              ].includes(node.type.name)
            )
              return;
            const id = node.attrs.blockId as string | null;
            if (!id || seen.has(id)) {
              const next = createBlockId();
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                blockId: next,
              });
              seen.add(next);
            } else seen.add(id);
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
export function ChapterEditor({
  nodeId,
  bookId,
  assetUrls,
  sources,
  initialContent,
  initialVersion,
}: {
  nodeId: string;
  bookId: string;
  assetUrls: Record<string, string>;
  sources: BookSource[];
  initialContent: ManuscriptDocument;
  initialVersion: number;
}) {
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [message, setMessage] = useState("All changes saved"),
    [state, setState] = useState("saved");
  const queue = useRef<Autosave<unknown> | null>(null);
  if (queue.current === null)
    queue.current = new Autosave(
      initialVersion,
      async (content, version) => {
        const response = await fetch(`/api/manuscript/nodes/${nodeId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            content: canonicalizeEditorImages(content),
            version,
          }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 409
              ? "Newer changes exist. Download your draft, then reload to compare."
              : (data.error ?? "Save failed."),
          );
        window.dispatchEvent(
          new CustomEvent("authorhub:chapter-saved", {
            detail: { nodeId, version: data.version, content: data.content },
          }),
        );
        return data.version;
      },
      (status, error) => {
        setState(status);
        setMessage(
          status === "saved"
            ? "All changes saved"
            : status === "saving"
              ? "Unsaved changes — saving…"
              : error instanceof Error
                ? error.message
                : "Save failed.",
        );
      },
    );
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        hardBreak: false,
        link: false,
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: null,
              parseHTML: (element) =>
                element.getAttribute("width")
                  ? Number(element.getAttribute("width"))
                  : null,
            },
            height: {
              default: null,
              parseHTML: (element) =>
                element.getAttribute("height")
                  ? Number(element.getAttribute("height"))
                  : null,
            },
            align: {
              default: "left",
              parseHTML: (element) =>
                element.getAttribute("data-align") ?? "left",
              renderHTML: (attrs) => ({
                "data-align": attrs.align as string,
                style: `display:block;margin-left:${attrs.align === "left" ? 0 : "auto"};margin-right:${attrs.align === "right" ? 0 : "auto"}`,
              }),
            },
            assetId: {
              default: null,
              parseHTML: (element) => element.getAttribute("data-asset-id"),
              renderHTML: (attrs) =>
                attrs.assetId
                  ? { "data-asset-id": attrs.assetId as string }
                  : {},
            },
          };
        },
      }).configure({ allowBase64: true }),
      TableKit,
      Footnote,
      Citation,
      Mathematics.configure({
        katexOptions: { throwOnError: false, trust: false },
        inlineOptions: {
          onClick: (node, pos) => {
            const latex = window.prompt(
              "Edit equation (LaTeX)",
              String(node.attrs.latex),
            );
            if (latex)
              editor?.chain().focus().updateInlineMath({ latex, pos }).run();
          },
        },
        blockOptions: {
          onClick: (node, pos) => {
            const latex = window.prompt(
              "Edit equation (LaTeX)",
              String(node.attrs.latex),
            );
            if (latex)
              editor?.chain().focus().updateBlockMath({ latex, pos }).run();
          },
        },
      }),
      StableBlocks,
    ],
    content: toEditorContent(initialContent, assetUrls),
    editorProps: {
      transformPasted: reidentifyPaste,
      handleClickOn(view, _pos, node, nodePos) {
        if (node.type.name !== "footnote" && node.type.name !== "citation")
          return false;
        const field = node.type.name === "footnote" ? "text" : "locator";
        const value = window.prompt(
          field === "text" ? "Edit note" : "Edit citation locator",
          String(node.attrs[field]),
        );
        if (value !== null)
          view.dispatch(
            view.state.tr.setNodeMarkup(nodePos, undefined, {
              ...node.attrs,
              [field]: value,
            }),
          );
        return true;
      },
      attributes: {
        class: "manuscript-editor",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Chapter manuscript editor",
      },
    },
    onUpdate({ editor }) {
      const json = editor.getJSON();
      queue.current!.enqueue(
        ensureStableBlockIds({
          version: 1,
          type: "doc",
          content: (json.content ?? []) as never[],
        }),
      );
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void queue.current?.flush(), 700);
    },
  });
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (queue.current?.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigation = (event: MouseEvent) => {
      if (
        queue.current?.dirty &&
        (event.target as Element).closest("a[href]")
      ) {
        event.preventDefault();
        setMessage("Save or download your draft before leaving this chapter.");
        void queue.current.flush();
      }
    };
    const beforeAction = (event: Event) => {
      if (queue.current?.dirty) {
        event.preventDefault();
        setMessage("Wait for changes to save before this action.");
        void queue.current.flush();
      }
    };
    window.addEventListener("authorhub:before-action", beforeAction);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigation, true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void queue.current?.flush();
      window.removeEventListener("authorhub:before-action", beforeAction);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", navigation, true);
    };
  }, []);
  if (!editor) return <div className="editor-loading">Loading editor…</div>;
  return (
    <div className="editor-frame">
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Text formatting"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-pressed={editor.isActive("bold")}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-pressed={editor.isActive("italic")}
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Heading
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
        >
          Redo
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered list
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          Code
        </button>
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          Table
        </button>
        <button
          type="button"
          disabled={!editor.isActive("table")}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          + Row
        </button>
        <button
          type="button"
          disabled={!editor.isActive("table")}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          + Column
        </button>
        <button
          type="button"
          disabled={!editor.isActive("table")}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          Remove table
        </button>
        <label className="image-upload">
          Figure
          <input
            aria-label="Insert figure"
            type="file"
            accept="image/png,image/jpeg"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const alt = window.prompt(
                "Describe this figure for readers using assistive technology:",
              );
              if (!alt?.trim()) return;
              setMessage("Uploading figure…");
              try {
                const asset = await uploadBookImage(bookId, file);
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "image",
                    attrs: {
                      src: asset.url,
                      assetId: asset.id,
                      alt: alt.trim(),
                      title: alt.trim(),
                    },
                  })
                  .run();
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Figure upload failed.",
                );
              }
            }}
          />
        </label>
        <button
          type="button"
          disabled={!editor.isActive("image")}
          onClick={() => {
            const attrs = editor.getAttributes("image");
            const alt = window.prompt(
              "Figure description (alt text)",
              String(attrs.alt ?? ""),
            );
            if (!alt?.trim()) return;
            const caption = window.prompt(
              "Figure caption",
              String(attrs.title ?? ""),
            );
            if (caption === null) return;
            const inches = window.prompt(
              "Figure width in inches (leave blank for natural size)",
              attrs.width ? String(Number(attrs.width) / 96) : "",
            );
            if (inches === null) return;
            const width = inches.trim() ? Number(inches) * 96 : null;
            if (
              width !== null &&
              (!Number.isFinite(width) || width < 24 || width > 1152)
            ) {
              setMessage("Choose a figure width from 0.25 to 12 inches.");
              return;
            }
            const align = window.prompt(
              "Figure alignment: left, center or right",
              String(attrs.align ?? "left"),
            );
            if (!align || !["left", "center", "right"].includes(align)) return;
            editor
              .chain()
              .focus()
              .updateAttributes("image", {
                alt: alt.trim(),
                title: caption,
                width,
                height: null,
                align,
              })
              .run();
          }}
        >
          Figure settings
        </button>
        <button
          type="button"
          onClick={() => {
            const latex = window.prompt("Inline equation (LaTeX)");
            if (latex) editor.chain().focus().insertInlineMath({ latex }).run();
          }}
        >
          Equation
        </button>
        <button
          type="button"
          onClick={() => {
            const latex = window.prompt("Display equation (LaTeX)");
            if (latex) editor.chain().focus().insertBlockMath({ latex }).run();
          }}
        >
          Display equation
        </button>
        <button
          type="button"
          onClick={() => {
            const text = window.prompt("Note text");
            if (text?.trim())
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "footnote",
                  attrs: { noteId: crypto.randomUUID(), text: text.trim() },
                })
                .run();
          }}
        >
          Footnote / note
        </button>
        <select
          aria-label="Citation source"
          value={sourceId}
          onChange={(event) => setSourceId(event.target.value)}
        >
          <option value="">Choose a source</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!sourceId}
          onClick={() => {
            const locator =
              window.prompt(
                "Citation locator (page, section, or leave blank)",
              ) ?? "";
            editor
              .chain()
              .focus()
              .insertContent({
                type: "citation",
                attrs: { citationId: crypto.randomUUID(), sourceId, locator },
              })
              .run();
          }}
        >
          Insert citation
        </button>
        <span role="status" className={`save-state ${state}`}>
          {message}
        </span>
      </div>
      {state === "error" && (
        <div>
          <button className="button" onClick={() => queue.current?.retry()}>
            Retry save
          </button>
          <button
            className="button"
            onClick={() => {
              const blob = new Blob(
                [JSON.stringify(editor.getJSON(), null, 2)],
                { type: "application/json" },
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "authorhub-unsaved-draft.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download draft
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
