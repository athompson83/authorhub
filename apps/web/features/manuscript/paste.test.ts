import { expect, it } from "vitest";
import { Schema, Slice, Fragment } from "@tiptap/pm/model";
import { reidentifyPaste } from "./paste";
it("preserves pasted prose and marks but gives copied blocks new identities", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*", attrs: { blockId: { default: null } } },
      text: {},
    },
    marks: { bold: {} },
  });
  const paragraph = schema.nodes.paragraph!.create(
    { blockId: "blk_originalidentifier0000" },
    schema.text("A cited passage", [schema.marks.bold!.create()]),
  );
  const original = new Slice(Fragment.from(paragraph), 1, 1),
    pasted = reidentifyPaste(original),
    again = reidentifyPaste(original);
  expect(pasted.content.firstChild!.attrs.blockId).not.toBe(
    paragraph.attrs.blockId,
  );
  expect(pasted.content.firstChild!.attrs.blockId).not.toBe(
    again.content.firstChild!.attrs.blockId,
  );
  expect(pasted.content.firstChild!.textContent).toBe("A cited passage");
  expect(pasted.content.firstChild!.firstChild!.marks[0]!.type.name).toBe(
    "bold",
  );
  expect(pasted.openStart).toBe(1);
  expect(original.content.firstChild!.attrs.blockId).toBe(
    "blk_originalidentifier0000",
  );
});
