import { expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { publicationSchema, publicationHtml, readiness } from "./publication";
import { epub, docx } from "./exports";
import { defaultEdition } from "./schema";
const id = "00000000-0000-4000-8000-000000000001",
  sourceId = "00000000-0000-4000-8000-000000000002",
  noteId = "00000000-0000-4000-8000-000000000003";
const publication = publicationSchema.parse({
  schemaVersion: 1,
  rendererVersion: "authorhub-1",
  book: { id, title: "Physics", subtitle: null },
  edition: { ...defaultEdition, author: "Test Author" },
  sources: [
    {
      id: sourceId,
      title: "Verified Reference",
      author: "N. Author",
      year: "2026",
      url: "https://example.org/reference",
    },
  ],
  nodes: [
    {
      id,
      title: "Energy",
      kind: "chapter",
      position: 1000,
      content_version: 1,
      content: {
        version: 1,
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { blockId: "blk_academicparagraph0001" },
            content: [
              { type: "text", text: "The energy relationship is " },
              { type: "inlineMath", attrs: { latex: "E=mc^2" } },
              {
                type: "footnote",
                attrs: { noteId, text: "Mass is measured in kilograms." },
              },
              {
                type: "citation",
                attrs: {
                  citationId: "00000000-0000-4000-8000-000000000004",
                  sourceId,
                  locator: "p. 12",
                },
              },
            ],
          },
          {
            type: "blockMath",
            attrs: {
              blockId: "blk_academicequation0001",
              latex: "\\frac{a^2}{b} + \\sqrt{x}",
            },
          },
        ],
      },
    },
  ],
});
it("renders equations, anchored notes and only cited bibliography entries", () => {
  const html = publicationHtml(publication);
  expect(html).toContain("<math");
  expect(html).toContain("<mfrac>");
  expect(html).toContain("Mass is measured in kilograms.");
  expect(html).toContain("Verified Reference");
  expect(html).toContain("[1, p. 12]");
  expect(readiness(publication).blockers).toEqual([]);
  expect(readiness({ ...publication, sources: [] }).blockers).toContain(
    "Resolve a citation whose source is missing.",
  );
});
it("packages MathML and note links in EPUB and native Office Math and footnotes in DOCX", async () => {
  const files = unzipSync(epub(publication, id)),
    opf = strFromU8(files["EPUB/package.opf"]!);
  expect(opf).toContain('properties="mathml"');
  expect(files["EPUB/references.xhtml"]).toBeDefined();
  expect(strFromU8(files["EPUB/chapter-0.xhtml"]!)).toContain(
    "references.xhtml#note-",
  );
  const word = unzipSync(
    new Uint8Array(await (await docx(publication)).arrayBuffer()),
  );
  const body = strFromU8(word["word/document.xml"]!);
  expect(body).toContain("m:oMath");
  expect(body).toContain("m:f");
  expect(body).toContain("footnoteReference");
  expect(strFromU8(word["word/footnotes.xml"]!)).toContain(
    "Mass is measured in kilograms.",
  );
  expect(body).toContain("Verified Reference");
});
