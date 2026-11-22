import { Fragment, Slice, type Node } from "@tiptap/pm/model";
import { createBlockId } from "@authorhub/manuscript";
/** Pasting creates new identities, even when copied from another book/chapter. */
export function reidentifyPaste(slice: Slice): Slice {
  function copy(node: Node): Node {
    if (node.isText) return node;
    const children: Node[] = [];
    node.content.forEach((child) => children.push(copy(child)));
    return node.type.create(
      {
        ...node.attrs,
        ...("blockId" in node.attrs ? { blockId: createBlockId() } : {}),
        ...("noteId" in node.attrs ? { noteId: crypto.randomUUID() } : {}),
        ...("citationId" in node.attrs
          ? { citationId: crypto.randomUUID() }
          : {}),
      },
      Fragment.fromArray(children),
      node.marks,
    );
  }
  const nodes: Node[] = [];
  slice.content.forEach((node) => nodes.push(copy(node)));
  return new Slice(Fragment.fromArray(nodes), slice.openStart, slice.openEnd);
}
