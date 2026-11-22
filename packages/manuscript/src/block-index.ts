import type {
  ManuscriptBlock,
  ManuscriptDocument,
  ManuscriptInline,
} from "./schema";

export interface ManuscriptBlockIndexEntry {
  blockId: string;
  blockType: string;
  ordinal: number;
  textContent: string;
}

function textFromBlock(block: ManuscriptBlock | ManuscriptInline): string {
  if (block.type === "text") return block.text;
  if (block.type === "image") return block.attrs.alt;
  if (block.type === "blockMath" || block.type === "inlineMath")
    return block.attrs.latex;
  if (block.type === "footnote") return block.attrs.text;
  if (block.type === "citation") return block.attrs.locator;
  return (block.content ?? [])
    .map((node) => ("text" in node ? node.text : textFromBlock(node)))
    .join(
      ["paragraph", "heading", "codeBlock"].includes(block.type) ? "" : "\n",
    );
}

export function extractBlockIndex(
  document: ManuscriptDocument,
): ManuscriptBlockIndexEntry[] {
  return document.content.map((block, ordinal) => ({
    blockId: block.attrs.blockId,
    blockType: block.type,
    ordinal,
    textContent: textFromBlock(block),
  }));
}
