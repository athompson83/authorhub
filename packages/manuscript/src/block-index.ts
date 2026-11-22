import type { ManuscriptBlock, ManuscriptDocument } from "./schema";

export interface ManuscriptBlockIndexEntry {
  blockId: string;
  blockType: string;
  ordinal: number;
  textContent: string;
}

function textFromBlock(block: ManuscriptBlock): string {
  if (block.type === "image") return block.attrs.alt;
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
