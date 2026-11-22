import { z } from "zod";
import { fontCss } from "./fonts";
import { sourceSchema } from "../references/schema";
import { isbnBarcode } from "./barcode";
import {
  manuscriptDocumentSchema,
  type ManuscriptBlock,
  type ManuscriptInline,
} from "@authorhub/manuscript";
import { mathHtml } from "./math";
import {
  referenceContext,
  citationText,
  bibliographyText,
  type ReferenceContext,
} from "./references";
import { editionSchema } from "./schema";
export const publicationSchema = z.object({
  schemaVersion: z.literal(1),
  rendererVersion: z.literal("authorhub-1"),
  frozenAt: z.string().datetime().optional(),
  book: z.object({
    id: z.string().uuid(),
    title: z.string(),
    subtitle: z.string().nullable(),
  }),
  edition: editionSchema,
  sources: z.array(sourceSchema).default([]),
  assets: z
    .array(
      z.object({
        id: z.string().uuid(),
        storage_path: z.string(),
        mime_type: z.enum(["image/png", "image/jpeg"]),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
        width: z.number().positive(),
        height: z.number().positive(),
      }),
    )
    .default([]),
  nodes: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      kind: z.enum([
        "front_matter",
        "part",
        "chapter",
        "section",
        "back_matter",
      ]),
      position: z.coerce.number(),
      content_version: z.number(),
      content: manuscriptDocumentSchema,
    }),
  ),
});
export type Publication = z.infer<typeof publicationSchema>;
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function blockHtml(block: ManuscriptBlock): string {
  return renderBlock(block, referenceContext([]));
}
export function renderBlock(
  block: ManuscriptBlock,
  context: ReferenceContext,
): string {
  if (block.type === "blockMath")
    return `<div class="equation">${mathHtml(block.attrs.latex, true)}</div>`;
  if (block.type === "image")
    return `<figure style="text-align:${block.attrs.align ?? "left"}"><img${block.attrs.width ? ` style="width:${block.attrs.width}px;height:auto"` : ""} src="${escapeHtml(block.attrs.src)}" alt="${escapeHtml(block.attrs.alt)}"/><figcaption>${escapeHtml(block.attrs.title ?? "")}</figcaption></figure>`;
  if (
    block.type !== "paragraph" &&
    block.type !== "heading" &&
    block.type !== "codeBlock"
  ) {
    const tags: Record<string, string> = {
      blockquote: "blockquote",
      bulletList: "ul",
      orderedList: "ol",
      listItem: "li",
      table: "table",
      tableRow: "tr",
      tableCell: "td",
      tableHeader: "th",
    };
    const tag = tags[block.type];
    const cells =
      block.type === "tableCell" || block.type === "tableHeader"
        ? ` colspan="${block.attrs.colspan ?? 1}" rowspan="${block.attrs.rowspan ?? 1}"`
        : "";
    const start =
      block.type === "orderedList" ? ` start="${block.attrs.start ?? 1}"` : "";
    const children = (block.content ?? [])
      .map((n) => renderBlock(n as ManuscriptBlock, context))
      .join("");
    return `<${tag}${cells}${start}>${block.type === "table" ? `<tbody>${children}</tbody>` : children}</${tag}>`;
  }
  const tag =
    block.type === "heading"
      ? `h${block.attrs.level}`
      : block.type === "codeBlock"
        ? "pre"
        : "p";
  const text = (block.content ?? [])
    .map((node) => inlineHtml(node, context))
    .join("");
  return `<${tag}>${text || "<br />"}</${tag}>`;
}
export function inlineHtml(
  node: ManuscriptInline,
  context: ReferenceContext,
): string {
  if (node.type === "inlineMath") return mathHtml(node.attrs.latex);
  if (node.type === "footnote")
    return `<sup><a id="note-ref-${node.attrs.noteId}" href="#note-${node.attrs.noteId}" role="doc-noteref">${context.notes.get(node.attrs.noteId)?.number ?? "*"}</a></sup>`;
  if (node.type === "citation")
    return `<a href="#source-${node.attrs.sourceId}" class="citation">${escapeHtml(citationText(node.attrs.sourceId, node.attrs.locator, context))}</a>`;
  let text = escapeHtml(node.text);
  for (const mark of node.marks ?? []) {
    const tag = {
      bold: "strong",
      italic: "em",
      underline: "u",
      strike: "s",
      code: "code",
    }[mark.type];
    text = `<${tag}>${text}</${tag}>`;
  }
  return text;
}
export function referenceHtml(context: ReferenceContext, epub = false): string {
  const notes = context.notes.size
    ? `<section class="chapter notes"${epub ? ' xmlns:epub="http://www.idpf.org/2007/ops"' : ""}><h1>Notes</h1>${[...context.notes].map(([id, n]) => `<aside id="note-${id}" role="doc-footnote"${epub ? ' epub:type="footnote"' : ""}><p><a href="#note-ref-${id}">${n.number}.</a> ${escapeHtml(n.text)}</p></aside>`).join("")}</section>`
    : "";
  const bibliography = context.citations.size
    ? `<section class="chapter bibliography"><h1>References</h1><ol>${[
        ...context.citations,
      ]
        .map(([id]) => {
          const source = context.sources.get(id);
          return `<li id="source-${id}">${source ? escapeHtml(bibliographyText(source)) : "Missing source"}</li>`;
        })
        .join("")}</ol></section>`
    : "";
  return notes + bibliography;
}
export function readiness(p: Publication) {
  const blockers: string[] = [];
  if (!p.edition.author.trim()) blockers.push("Add the author name.");
  if (!p.nodes.length) blockers.push("Add manuscript chapters.");
  for (const n of p.nodes)
    if (!n.content.content.length)
      blockers.push(`Write content for “${n.title}”.`);
  const warnings: string[] = [];
  if (!p.edition.isbn)
    warnings.push("No ISBN assigned. Confirm your distributor’s requirements.");
  if (!p.edition.copyright)
    warnings.push("Add a copyright / rights statement.");
  warnings.push(
    "Proofread and verify references, image rights, accessibility, and printer specifications before distribution.",
  );
  const refs = referenceContext(p.nodes, p.sources);
  for (const id of refs.citations.keys())
    if (!refs.sources.has(id))
      blockers.push("Resolve a citation whose source is missing.");
  function validateMath(node: ManuscriptBlock | ManuscriptInline) {
    if (node.type === "inlineMath" || node.type === "blockMath") {
      try {
        mathHtml(node.attrs.latex, false, true);
      } catch {
        blockers.push(
          "Correct an invalid equation before freezing this edition.",
        );
      }
    }
    if ("content" in node) node.content?.forEach(validateMath);
  }
  p.nodes.forEach((n) => n.content.content.forEach(validateMath));
  return { blockers, warnings };
}
export function coverHtml(p: Publication, wrap = false) {
  const e = p.edition,
    h = escapeHtml;
  const panel = (back: boolean) =>
    `<section class="cover-panel" style="width:${e.trimWidth}in;height:${e.trimHeight}in;background:${e.coverColor};color:${e.coverTextColor};text-align:${e.coverAlign}">${(back ? e.backImage : e.coverImage) ? `<img alt="" src="${h(back ? e.backImage : e.coverImage)}" style="opacity:${e.coverImageOpacity};height:calc(100% + ${wrap ? 2 * e.bleed : 0}in);width:calc(100% + ${wrap ? e.bleed : 0}in);top:-${wrap ? e.bleed : 0}in;left:${back ? -1 * (wrap ? e.bleed : 0) : 0}in" />` : ""}<div class="cover-copy" style="padding:${e.coverInset}in;font-size:${back ? e.backFontSize : e.fontSize}pt">${back ? `<p>${h(e.backText).replace(/\n/g, "<br />")}</p>${e.barcode && e.isbn ? `<div style="margin-top:auto;align-self:flex-end">${isbnBarcode(e.isbn, e.barcodeWidth)}</div>` : ""}` : `<h1 style="font-size:${e.coverTitleSize}pt;margin-top:${e.coverTitleOffset}in">${h(p.book.title)}</h1><h2>${h(p.book.subtitle ?? "")}</h2><p>${h(e.name)}</p><p class="cover-author">${h(e.author)}</p>`}</div></section>`;
  return `<div class="cover-wrap" style="padding:${wrap ? e.bleed : 0}in;background:${e.coverColor}">${wrap ? panel(true) + `<section class="spine" style="width:${e.spineWidth}in;height:${e.trimHeight}in;color:${e.coverTextColor}"><span>${h(e.spineText || `${p.book.title} · ${e.author}`)}</span></section>` : ""}${panel(false)}</div>`;
}
export function publicationHtml(
  p: Publication,
  mode: "interior" | "cover" = "interior",
) {
  const e = p.edition,
    h = escapeHtml;
  const width =
    mode === "cover"
      ? 2 * e.trimWidth + e.spineWidth + 2 * e.bleed
      : e.trimWidth;
  const height = e.trimHeight + (mode === "cover" ? 2 * e.bleed : 0);
  const refs = referenceContext(p.nodes, p.sources);
  const sections = p.nodes
    .map(
      (n) =>
        `<section class="chapter" id="n-${n.id}"><h1>${h(n.title)}</h1>${n.content.content.map((block) => renderBlock(block, refs)).join("")}</section>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="${h(e.language)}"><head><meta charset="utf-8"/><title>${h(p.book.title)}</title><style>${fontCss(e.font, (filename) => `/fonts/${filename}`)}
 @page {size:${width}in ${height}in;margin:${mode === "cover" ? 0 : e.margin}in;${e.pageNumbers && mode === "interior" ? `@bottom-center {content:counter(page);font-size:9pt;font-family:'${e.font}'}` : ""}}
 @page:left {margin-right:${mode === "cover" ? 0 : e.margin + e.gutter}in} @page:right {margin-left:${mode === "cover" ? 0 : e.margin + e.gutter}in}
 *{box-sizing:border-box} body{margin:0;color:#222;font-family:'${e.font}',serif;font-size:${e.fontSize}pt;line-height:${e.lineHeight}}
 img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%;break-inside:avoid}td,th{border:1px solid #aaa;padding:6pt;text-align:left}figure{margin:1em 0;break-inside:avoid}figcaption{font-size:.85em}pre{white-space:pre-wrap} h1,h2,h3{color:${e.accent};line-height:1.2;break-after:avoid} h1{font-size:2em} p{margin:0 0 ${e.paragraphSpacing}pt;text-indent:${e.indent}in;orphans:3;widows:3} blockquote{border-left:2pt solid ${e.accent};padding-left:1em} .chapter,.title-page,.contents{break-before:page} .title-page{padding-top:20%;text-align:center} a{color:inherit} .contents a{display:block;margin:1em 0} .running{font-size:9pt;color:#555} .cover-wrap{display:flex;width:max-content;break-after:page;overflow:hidden} .cover-panel{position:relative;overflow:visible;flex-shrink:0} .cover-panel img{position:absolute;width:100%;height:100%;object-fit:cover;inset:0} .cover-copy{position:relative;padding:.65in;height:100%;display:flex;flex-direction:column} .cover-copy h1,.cover-copy h2{color:inherit} .cover-copy p{white-space:normal;text-indent:0} .cover-author{margin-top:auto} .spine{display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}.spine span{writing-mode:vertical-rl;white-space:nowrap;font-size:${e.spineFontSize}pt}
 @media screen {body{background:#ecece8;padding:24px}.print-content{background:white;max-width:${width}in;margin:auto;padding:${mode === "cover" ? 0 : e.margin}in;box-shadow:0 2px 20px #0001}.chapter{padding-top:1em}.cover-wrap{margin:auto}.print-help{font:14px system-ui;text-align:center;margin-bottom:20px}} @media print{.print-help{display:none}.print-content{padding:0}.running{position:fixed;top:-.4in}}
 </style></head><body><div class="print-help">Use your browser’s Print → Save as PDF. Set scale to 100%, disable browser headers and footers, and use the document’s custom paper size. Proof against your printer’s template.</div>${mode === "cover" ? coverHtml(p, true) : `<main class="print-content"><div class="running">${h(e.runningHeader)}</div><section class="title-page"><h1>${h(p.book.title)}</h1><h2>${h(p.book.subtitle ?? "")}</h2><p>${h(e.author)}</p><p>${h(e.name)}</p><p>${h(e.publisher)}</p><p>${h(e.copyright)}</p>${e.isbn ? `<p>ISBN ${h(e.isbn)}</p>` : ""}</section>${e.toc ? `<nav class="contents"><h1>Contents</h1>${p.nodes.map((n) => `<a href="#n-${n.id}">${h(n.title)}</a>`).join("")}</nav>` : ""}${sections}${referenceHtml(refs)}</main>`}</body></html>`;
}
