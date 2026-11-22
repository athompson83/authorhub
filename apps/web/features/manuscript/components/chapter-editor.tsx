"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
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
  initialContent,
  initialVersion,
}: {
  nodeId: string;
  initialContent: ManuscriptDocument;
  initialVersion: number;
}) {
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
          body: JSON.stringify({ content, version }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 409
              ? "Newer changes exist. Download your draft, then reload to compare."
              : (data.error ?? "Save failed."),
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
      Image.configure({ allowBase64: true }),
      TableKit,
      StableBlocks,
    ],
    content: toEditorContent(initialContent),
    editorProps: {
      transformPasted: reidentifyPaste,
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
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (
                file.size > 2_000_000 ||
                !["image/png", "image/jpeg"].includes(file.type)
              ) {
                setMessage("Choose a PNG or JPEG under 2 MB.");
                return;
              }
              const alt = window.prompt(
                "Describe this figure for readers using assistive technology:",
              );
              if (!alt?.trim()) return;
              const reader = new FileReader();
              reader.onload = () =>
                editor
                  .chain()
                  .focus()
                  .setImage({
                    src: String(reader.result),
                    alt: alt.trim(),
                    title: alt.trim(),
                  })
                  .run();
              reader.readAsDataURL(file);
            }}
          />
        </label>
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
