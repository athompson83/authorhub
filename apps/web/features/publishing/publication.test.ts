import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { defaultEdition, editionSchema } from "./schema";
import { publicationSchema, publicationHtml, readiness } from "./publication";
import { epub, docx } from "./exports";
const id = "00000000-0000-4000-8000-000000000001";
const publication = publicationSchema.parse({
  schemaVersion: 1,
  rendererVersion: "authorhub-1",
  book: {
    id,
    title: "Science & Society <script>alert(1)</script>",
    subtitle: null,
  },
  edition: { ...defaultEdition, author: "A. Author" },
  nodes: [
    {
      id,
      title: "Chapter One",
      kind: "chapter",
      position: 1000,
      content_version: 1,
      content: {
        version: 1,
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { blockId: "blk_1234567890123456" },
            content: [
              { type: "text", text: "A < B & C", marks: [{ type: "bold" }] },
            ],
          },
        ],
      },
    },
  ],
});
describe("publication contracts", () => {
  it("validates ISBN check digits, safe images and usable page geometry", () => {
    expect(
      editionSchema.safeParse({ ...defaultEdition, isbn: "9780306406157" })
        .success,
    ).toBe(true);
    expect(
      editionSchema.safeParse({ ...defaultEdition, isbn: "9780306406158" })
        .success,
    ).toBe(false);
    expect(
      editionSchema.safeParse({
        ...defaultEdition,
        coverImage: "https://example.com/tracker.png",
      }).success,
    ).toBe(false);
    expect(
      editionSchema.safeParse({ ...defaultEdition, trimWidth: 4, margin: 2 })
        .success,
    ).toBe(false);
  });
  it("escapes author content and produces configured print geometry", () => {
    const html = publicationHtml(publication);
    expect(html).not.toContain("<script>");
    expect(html).toContain("A &lt; B &amp; C");
    expect(html).toContain("size:7in 10in");
    expect(html).toContain("<strong>");
    expect(publicationHtml(publication, "cover")).toContain(
      "size:14.75in 10.25in",
    );
  });
  it("flags empty manuscripts and missing authors", () => {
    expect(
      readiness({ ...publication, nodes: [], edition: defaultEdition })
        .blockers,
    ).toHaveLength(2);
  });
  it("builds a deterministic EPUB package with an uncompressed first mimetype and matching spine", () => {
    const first = epub(publication, id),
      second = epub(publication, id);
    expect(first).toEqual(second);
    expect(first[8]).toBe(0);
    expect(new TextDecoder().decode(first.slice(30, 38))).toBe("mimetype");
    const files = unzipSync(first);
    expect(strFromU8(files.mimetype!)).toBe("application/epub+zip");
    expect(strFromU8(files["EPUB/package.opf"]!)).toContain(
      '<itemref idref="c0"/>',
    );
    expect(strFromU8(files["EPUB/chapter-0.xhtml"]!)).toContain(
      "A &lt; B &amp; C",
    );
  });
  it("builds a DOCX archive with canonical prose, headings, and trim size", async () => {
    const blob = await docx(publication),
      files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const xml = strFromU8(files["word/document.xml"]!);
    expect(xml).toContain("Chapter One");
    expect(xml).toContain("A &lt; B &amp; C");
    expect(xml).toContain('w:w="10080"');
  });
});
