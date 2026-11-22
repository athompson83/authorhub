import { Node, mergeAttributes } from "@tiptap/core";
export const Footnote = Node.create({
  name: "footnote",
  inline: true,
  group: "inline",
  atom: true,
  addAttributes() {
    return { noteId: { default: null }, text: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "sup[data-footnote]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(HTMLAttributes, {
        "data-footnote": "true",
        title: HTMLAttributes.text as string,
        class: "academic-note",
      }),
      "[note]",
    ];
  },
});
export const Citation = Node.create({
  name: "citation",
  inline: true,
  group: "inline",
  atom: true,
  addAttributes() {
    return {
      citationId: { default: null },
      sourceId: { default: null },
      locator: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "cite[data-citation]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "cite",
      mergeAttributes(HTMLAttributes, {
        "data-citation": "true",
        class: "academic-citation",
      }),
      "[citation]",
    ];
  },
});
