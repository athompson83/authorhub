import type { ManuscriptBlock, ManuscriptDocument } from './schema';

export interface ManuscriptBlockIndexEntry {
  blockId: string;
  blockType: string;
  ordinal: number;
  textContent: string;
}

function textFromBlock(block: ManuscriptBlock): string {
  if (block.type === 'blockquote') {
    return block.content.map(textFromBlock).join('\n');
  }
  return (block.content ?? []).map((node) => node.text).join('');
}

export function extractBlockIndex(document: ManuscriptDocument): ManuscriptBlockIndexEntry[] {
  return document.content.map((block, ordinal) => ({
    blockId: block.attrs.blockId,
    blockType: block.type,
    ordinal,
    textContent: textFromBlock(block),
  }));
}
