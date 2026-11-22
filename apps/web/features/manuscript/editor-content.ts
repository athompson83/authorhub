import type { JSONContent } from "@tiptap/core";
import type { ManuscriptDocument } from "@authorhub/manuscript";
/** Canonical block and inline shapes are deliberately ProseMirror-compatible. */
export function toEditorContent(document: ManuscriptDocument): JSONContent {
  return structuredClone({
    type: "doc",
    content: document.content,
  }) as JSONContent;
}
