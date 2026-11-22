import { describe, expect, it } from "vitest";
import { manuscriptDocumentSchema } from "./schema";

describe("manuscriptDocumentSchema", () => {
  it("rejects addressable blocks without stable block ids", () => {
    const result = manuscriptDocumentSchema.safeParse({
      version: 1,
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("round-trips a valid structured document", () => {
    const document = {
      version: 1,
      type: "doc" as const,
      content: [
        {
          type: "paragraph" as const,
          attrs: { blockId: "blk_01JTESTAUTHORHUB000000000001" },
          content: [
            { type: "text" as const, text: "Evidence stays addressable." },
          ],
        },
      ],
    };

    expect(manuscriptDocumentSchema.parse(document)).toEqual(document);
  });
});

it("rejects duplicated identities and invalid table structure", () => {
  const paragraph = {
    type: "paragraph",
    attrs: { blockId: "blk_duplicateidentifier000" },
    content: [{ type: "text", text: "Cell" }],
  };
  expect(
    manuscriptDocumentSchema.safeParse({
      version: 1,
      type: "doc",
      content: [paragraph, paragraph],
    }).success,
  ).toBe(false);
  expect(
    manuscriptDocumentSchema.safeParse({
      version: 1,
      type: "doc",
      content: [
        {
          type: "table",
          attrs: { blockId: "blk_tableidentifier000000" },
          content: [paragraph],
        },
      ],
    }).success,
  ).toBe(false);
});
it("round-trips textbook table structure and cell attributes", () => {
  const paragraph = {
    type: "paragraph",
    attrs: { blockId: "blk_paragraphidentifier00" },
    content: [{ type: "text", text: "Evidence" }],
  };
  const document = {
    version: 1,
    type: "doc",
    content: [
      {
        type: "table",
        attrs: { blockId: "blk_tableidentifier000000" },
        content: [
          {
            type: "tableRow",
            attrs: { blockId: "blk_rowidentifier00000000" },
            content: [
              {
                type: "tableHeader",
                attrs: {
                  blockId: "blk_cellidentifier0000000",
                  colspan: 1,
                  rowspan: 1,
                  colwidth: null,
                },
                content: [paragraph],
              },
            ],
          },
        ],
      },
    ],
  };
  expect(manuscriptDocumentSchema.parse(document)).toEqual(document);
});
