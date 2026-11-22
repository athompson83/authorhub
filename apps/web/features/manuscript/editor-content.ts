import type { JSONContent } from "@tiptap/core";
import type { ManuscriptDocument } from "@authorhub/manuscript";
/** Canonical block and inline shapes are deliberately ProseMirror-compatible. */
export function toEditorContent(document: ManuscriptDocument,assets:Record<string,string>={}): JSONContent {
  const value=structuredClone({
    type: "doc",
    content: document.content,
  }) as JSONContent;
  function visit(node:JSONContent){if(node.type==="image"&&typeof node.attrs?.src==="string"&&node.attrs.src.startsWith("asset:")){const id=node.attrs.src.slice(6);node.attrs={...node.attrs,assetId:id,src:assets[id]??""};}node.content?.forEach(visit);}
  visit(value);return value;
}
