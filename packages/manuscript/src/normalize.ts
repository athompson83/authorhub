import { createBlockId, isBlockId } from './block-id';

interface LooseNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: LooseNode[];
  text?: string;
}

interface LooseDocument {
  version: 1;
  type: 'doc';
  content: LooseNode[];
}

function normalizeBlock(node: LooseNode): LooseNode {
  if (node.type === 'text') return { ...node };

  const currentId = typeof node.attrs?.blockId === 'string' ? node.attrs.blockId : null;
  const attrs = {
    ...node.attrs,
    blockId: currentId && isBlockId(currentId) ? currentId : createBlockId(),
  };

  return {
    ...node,
    attrs,
    content: node.content?.map((child) => (child.type === 'text' ? { ...child } : normalizeBlock(child))),
  };
}

export function ensureStableBlockIds(document: LooseDocument): LooseDocument {
  return {
    ...document,
    content: document.content.map(normalizeBlock),
  };
}
