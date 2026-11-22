import { zipSync, strToU8 } from "fflate";
import { fontCss, type PublicationFontFile } from "./fonts";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  FootnoteReferenceRun,
  InternalHyperlink,
  Bookmark,
  Header,
  Footer,
  PageNumber,
  LevelFormat,
  AlignmentType,
  type ParagraphChild,
} from "docx";
import type { ManuscriptBlock, ManuscriptInline } from "@authorhub/manuscript";
import {
  blockHtml,
  renderBlock,
  referenceHtml,
  escapeHtml,
  type Publication,
} from "./publication";

import {
  referenceContext,
  citationText,
  bibliographyText,
  type ReferenceContext,
} from "./references";
import { officeMath } from "./office-math";

export function epub(
  p: Publication,
  identifier: string,
  fonts: PublicationFontFile[] = [],
): Uint8Array {
  const h = escapeHtml,
    e = p.edition;
  const references = referenceContext(p.nodes, p.sources),
    mathChapters = new Set<number>();
  const xhtml = (title: string, body: string) =>
    `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="${h(e.language)}" xml:lang="${h(e.language)}"><head><title>${h(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${body}</body></html>`;
  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
    mimetype: [strToU8("application/epub+zip"), { level: 0 }],
  };
  files["META-INF/container.xml"] = strToU8(
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  files["EPUB/style.css"] = strToU8(
    `${fonts.length ? fontCss(e.font, (filename) => `fonts/${filename}`) : ""}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:.4em}body{font-family:'${e.font}',serif;line-height:${e.lineHeight}}h1,h2,h3{color:${e.accent}}p{margin-bottom:${e.paragraphSpacing}pt}img{max-width:100%}`,
  );
  for (const font of fonts) files[`EPUB/fonts/${font.filename}`] = font.bytes;
  const figures = new Map<string, string>();
  for (const n of p.nodes) {
    const html = n.content.content.map(blockHtml).join("");
    for (const match of html.matchAll(
      /src="(data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*)"/g,
    )) {
      if (figures.has(match[1]!)) continue;
      const path = `figure-${figures.size}.${match[2] === "png" ? "png" : "jpg"}`;
      figures.set(match[1]!, path);
      files[`EPUB/${path}`] = Uint8Array.from(
        atob(match[1]!.split(",")[1]!),
        (c) => c.charCodeAt(0),
      );
    }
  }
  let coverItem = "";
  if (e.coverImage) {
    const ext = e.coverImage.startsWith("data:image/png") ? "png" : "jpg";
    const base64 = e.coverImage.split(",")[1]!;
    files[`EPUB/cover.${ext}`] = Uint8Array.from(atob(base64), (c) =>
      c.charCodeAt(0),
    );
    coverItem = `<item id="cover-image" href="cover.${ext}" media-type="image/${ext === "jpg" ? "jpeg" : "png"}" properties="cover-image"/>`;
    files["EPUB/cover.xhtml"] = strToU8(
      xhtml(
        p.book.title,
        `<h1>${h(p.book.title)}</h1><p>${h(e.author)}</p><img src="cover.${ext}" alt="Cover artwork"/>`,
      ),
    );
  }
  files["EPUB/title.xhtml"] = strToU8(
    xhtml(
      p.book.title,
      `<h1>${h(p.book.title)}</h1><p>${h(p.book.subtitle ?? "")}</p><p>${h(e.author)}</p><p>${h(e.copyright)}</p>`,
    ),
  );
  files["EPUB/nav.xhtml"] = strToU8(
    `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${h(e.language)}"><head><title>Contents</title></head><body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${p.nodes.map((n, i) => `<li><a href="chapter-${i}.xhtml">${h(n.title)}</a></li>`).join("")}</ol></nav></body></html>`,
  );
  p.nodes.forEach((n, i) => {
    let html = n.content.content
      .map((block) => renderBlock(block, references))
      .join("");
    if (html.includes("<math")) mathChapters.add(i);
    html = html
      .replaceAll('href="#note-', 'href="references.xhtml#note-')
      .replaceAll('href="#source-', 'href="references.xhtml#source-');
    for (const [src, path] of figures) html = html.replaceAll(src, path);
    files[`EPUB/chapter-${i}.xhtml`] = strToU8(
      xhtml(n.title, `<h1>${h(n.title)}</h1>${html}`),
    );
  });
  const hasReferences =
    references.notes.size > 0 || references.citations.size > 0;
  if (hasReferences) {
    let html = referenceHtml(references, true);
    for (const [id] of references.notes) {
      const chapter = p.nodes.findIndex((node) =>
        JSON.stringify(node.content).includes(id),
      );
      html = html.replaceAll(
        `href="#note-ref-${id}"`,
        `href="chapter-${chapter}.xhtml#note-ref-${id}"`,
      );
    }
    files["EPUB/references.xhtml"] = strToU8(
      xhtml("Notes and references", html),
    );
  }
  files["EPUB/package.opf"] = strToU8(
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pub-id">urn:uuid:${h(identifier)}</dc:identifier><dc:title>${h(p.book.title)}</dc:title><dc:creator>${h(e.author)}</dc:creator><dc:language>${h(e.language)}</dc:language>${e.publisher ? `<dc:publisher>${h(e.publisher)}</dc:publisher>` : ""}${e.description ? `<dc:description>${h(e.description)}</dc:description>` : ""}${e.copyright ? `<dc:rights>${h(e.copyright)}</dc:rights>` : ""}<meta property="dcterms:modified">${h((p.frozenAt ?? "2000-01-01T00:00:00Z").replace(/\.\d+Z$/, "Z"))}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>${coverItem}${fonts.map((font, index) => `<item id="font${index}" href="fonts/${font.filename}" media-type="${font.mediaType}"/>`).join("")}${[...figures.values()].map((path, i) => `<item id="figure${i}" href="${path}" media-type="image/${path.endsWith(".png") ? "png" : "jpeg"}"/>`).join("")}${e.coverImage ? '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>' : ""}${p.nodes.map((_, i) => `<item id="c${i}" href="chapter-${i}.xhtml" media-type="application/xhtml+xml"${mathChapters.has(i) ? ' properties="mathml"' : ""}/>`).join("")}${hasReferences ? '<item id="references" href="references.xhtml" media-type="application/xhtml+xml"/>' : ""}</manifest><spine>${e.coverImage ? '<itemref idref="cover"/>' : ""}<itemref idref="title"/><itemref idref="nav"/>${p.nodes.map((_, i) => `<itemref idref="c${i}"/>`).join("")}${hasReferences ? '<itemref idref="references"/>' : ""}</spine></package>`,
  );
  return zipSync(files, { level: 6, mtime: new Date("2000-01-01T00:00:00Z") });
}
function figureDimensions(data: Uint8Array, requestedWidth?: number | null) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let width = 4,
    height = 3;
  if (data.length > 24 && view.getUint32(0) === 0x89504e47) {
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (data[0] === 255 && data[1] === 216) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 255) break;
      const marker = data[offset + 1]!;
      if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
        height = view.getUint16(offset + 5);
        width = view.getUint16(offset + 7);
        break;
      }
      const length = view.getUint16(offset + 2);
      if (length < 2) break;
      offset += length + 2;
    }
  }
  const scale = requestedWidth
    ? requestedWidth / Math.max(width, 1)
    : Math.min(1, 400 / Math.max(width, 1), 560 / Math.max(height, 1));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
function wordInline(
  node: ManuscriptInline,
  context: ReferenceContext,
): ParagraphChild {
  if (node.type === "inlineMath") return officeMath(node.attrs.latex);
  if (node.type === "footnote")
    return new FootnoteReferenceRun(
      context.notes.get(node.attrs.noteId)!.number,
    );
  if (node.type === "citation")
    return new TextRun(
      citationText(node.attrs.sourceId, node.attrs.locator, context),
    );
  return new TextRun({
    text: node.text,
    bold: !!node.marks?.some((m) => m.type === "bold"),
    italics: !!node.marks?.some((m) => m.type === "italic"),
    strike: !!node.marks?.some((m) => m.type === "strike"),
    ...(node.marks?.some((m) => m.type === "underline")
      ? { underline: {} }
      : {}),
  });
}
function paragraphs(
  block: ManuscriptBlock,
  context: ReferenceContext,
  list?: string,
): (Paragraph | Table)[] {
  if (block.type === "blockMath")
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [officeMath(block.attrs.latex)],
      }),
    ];
  if (block.type === "image") {
    const data = Uint8Array.from(atob(block.attrs.src.split(",")[1]!), (c) =>
      c.charCodeAt(0),
    );
    return [
      new Paragraph({
        children: [
          new ImageRun({
            data,
            type: block.attrs.src.startsWith("data:image/png") ? "png" : "jpg",
            transformation: figureDimensions(data, block.attrs.width),
            altText: {
              title: block.attrs.alt,
              description: block.attrs.alt,
              name: "Figure",
            },
          }),
        ],
      }),
      new Paragraph(block.attrs.title ?? ""),
    ];
  }
  if (block.type === "bulletList" || block.type === "orderedList")
    return block.content.flatMap((item) =>
      paragraphs(item, context, `list_${block.attrs.blockId}`),
    );
  if (block.type === "listItem")
    return block.content.flatMap((child, index) =>
      paragraphs(child, context, index === 0 ? list : undefined),
    );
  if (block.type === "table")
    return [
      new Table({
        rows: block.content.map(
          (row) =>
            new TableRow({
              children: ("content" in row ? (row.content ?? []) : []).map(
                (cell) =>
                  new TableCell({
                    children: ("content" in cell
                      ? (cell.content ?? [])
                      : []
                    ).flatMap((child) =>
                      paragraphs(child as ManuscriptBlock, context),
                    ),
                  }),
              ),
            }),
        ),
      }),
    ];
  if (
    block.type !== "paragraph" &&
    block.type !== "heading" &&
    block.type !== "codeBlock"
  )
    return block.content.flatMap((child) => paragraphs(child, context));
  return [
    new Paragraph({
      ...(list ? { numbering: { reference: list, level: 0 } } : {}),
      ...(block.type === "heading"
        ? {
            heading: [
              HeadingLevel.HEADING_1,
              HeadingLevel.HEADING_2,
              HeadingLevel.HEADING_3,
              HeadingLevel.HEADING_4,
              HeadingLevel.HEADING_5,
              HeadingLevel.HEADING_6,
            ][block.attrs.level - 1]!,
          }
        : {}),
      children: (block.content ?? []).map((node) => wordInline(node, context)),
    }),
  ];
}
export async function docx(p: Publication): Promise<Blob> {
  const e = p.edition,
    context = referenceContext(p.nodes, p.sources);
  const lists: {
    reference: string;
    levels: {
      level: number;
      format: typeof LevelFormat.DECIMAL | typeof LevelFormat.BULLET;
      text: string;
      start: number;
      style: { paragraph: { indent: { left: number; hanging: number } } };
    }[];
  }[] = [];
  function collect(block: ManuscriptBlock, depth = 0) {
    if (block.type === "bulletList" || block.type === "orderedList")
      lists.push({
        reference: `list_${block.attrs.blockId}`,
        levels: [
          {
            level: 0,
            format:
              block.type === "orderedList"
                ? LevelFormat.DECIMAL
                : LevelFormat.BULLET,
            text: block.type === "orderedList" ? "%1." : "•",
            start: block.attrs.start ?? 1,
            style: {
              paragraph: { indent: { left: 720 + depth * 360, hanging: 360 } },
            },
          },
        ],
      });
    if ("content" in block)
      for (const child of block.content ?? [])
        if (
          child.type !== "text" &&
          child.type !== "inlineMath" &&
          child.type !== "footnote" &&
          child.type !== "citation"
        )
          collect(
            child,
            depth +
              (block.type === "bulletList" || block.type === "orderedList"
                ? 1
                : 0),
          );
  }
  p.nodes.forEach((node) =>
    node.content.content.forEach((block) => collect(block)),
  );
  const anchor = (id: string) => `n_${id.replace(/-/g, "")}`;
  return Packer.toBlob(
    new Document({
      title: p.book.title,
      creator: e.author,
      description: e.description,
      numbering: { config: lists },
      footnotes: Object.fromEntries(
        [...context.notes].map(([, note]) => [
          String(note.number),
          { children: [new Paragraph(note.text)] },
        ]),
      ),
      styles: {
        default: {
          document: {
            run: { font: e.font, size: e.fontSize * 2 },
            paragraph: {
              spacing: {
                after: e.paragraphSpacing * 20,
                line: Math.round(e.lineHeight * 240),
              },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: Math.round(e.trimWidth * 1440),
                height: Math.round(e.trimHeight * 1440),
              },
              margin: {
                top: e.margin * 1440,
                bottom: e.margin * 1440,
                left: (e.margin + e.gutter) * 1440,
                right: e.margin * 1440,
              },
            },
          },
          ...(e.runningHeader
            ? {
                headers: {
                  default: new Header({
                    children: [new Paragraph(e.runningHeader)],
                  }),
                },
              }
            : {}),
          ...(e.pageNumbers
            ? {
                footers: {
                  default: new Footer({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ children: [PageNumber.CURRENT] }),
                        ],
                      }),
                    ],
                  }),
                },
              }
            : {}),
          children: [
            new Paragraph({ text: p.book.title, heading: HeadingLevel.TITLE }),
            new Paragraph(p.book.subtitle ?? ""),
            new Paragraph(e.author),
            new Paragraph(e.copyright),
            ...(e.toc
              ? [
                  new Paragraph({ children: [new PageBreak()] }),
                  new Paragraph({
                    text: "Contents",
                    heading: HeadingLevel.HEADING_1,
                  }),
                  ...p.nodes.map(
                    (node) =>
                      new Paragraph({
                        children: [
                          new InternalHyperlink({
                            anchor: anchor(node.id),
                            children: [
                              new TextRun({
                                text: node.title,
                                style: "Hyperlink",
                              }),
                            ],
                          }),
                        ],
                      }),
                  ),
                ]
              : []),
            ...p.nodes.flatMap((node) => [
              new Paragraph({ children: [new PageBreak()] }),
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [
                  new Bookmark({
                    id: anchor(node.id),
                    children: [new TextRun(node.title)],
                  }),
                ],
              }),
              ...node.content.content.flatMap((block) =>
                paragraphs(block, context),
              ),
            ]),
            ...(context.citations.size
              ? [
                  new Paragraph({ children: [new PageBreak()] }),
                  new Paragraph({
                    text: "References",
                    heading: HeadingLevel.HEADING_1,
                  }),
                  ...[...context.citations].map(
                    ([id, number]) =>
                      new Paragraph(
                        `${number}. ${bibliographyText(context.sources.get(id)!)}`,
                      ),
                  ),
                ]
              : []),
          ],
        },
      ],
    }),
  );
}
