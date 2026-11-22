import { z } from "zod";
import {
  manuscriptDocumentSchema,
  type ManuscriptBlock,
} from "@authorhub/manuscript";
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
  nodes: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      kind: z.string(),
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
  if (block.type === "image")
    return `<figure><img src="${block.attrs.src}" alt="${escapeHtml(block.attrs.alt)}"/><figcaption>${escapeHtml(block.attrs.title ?? "")}</figcaption></figure>`;
  if (!["paragraph", "heading", "codeBlock"].includes(block.type)) {
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
      .map((n) => blockHtml(n as ManuscriptBlock))
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
    .map((n) => {
      if (!("text" in n)) return "";
      let text = escapeHtml(n.text);
      for (const mark of n.marks ?? []) {
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
    })
    .join("");
  return `<${tag}>${text || "<br />"}</${tag}>`;
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
  return { blockers, warnings };
}
export function coverHtml(p: Publication, wrap = false) {
  const e = p.edition,
    h = escapeHtml;
  const panel = (back: boolean) =>
    `<section class="cover-panel" style="width:${e.trimWidth}in;height:${e.trimHeight}in;background:${e.coverColor};color:${e.coverTextColor};text-align:${e.coverAlign}">${(back ? e.backImage : e.coverImage) ? `<img alt="" src="${back ? e.backImage : e.coverImage}" style="opacity:${e.coverImageOpacity}" />` : ""}<div class="cover-copy">${back ? `<p>${h(e.backText).replace(/\n/g, "<br />")}</p>` : `<h1 style="font-size:${e.coverTitleSize}pt">${h(p.book.title)}</h1><h2>${h(p.book.subtitle ?? "")}</h2><p>${h(e.name)}</p><p class="cover-author">${h(e.author)}</p>`}</div></section>`;
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
  const sections = p.nodes
    .map(
      (n) =>
        `<section class="chapter" id="n-${n.id}"><h1>${h(n.title)}</h1>${n.content.content.map(blockHtml).join("")}</section>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="${h(e.language)}"><head><meta charset="utf-8"/><title>${h(p.book.title)}</title><style>
 @page {size:${width}in ${height}in;margin:${mode === "cover" ? 0 : e.margin}in;${e.pageNumbers && mode === "interior" ? "@bottom-center {content:counter(page);font-size:9pt}" : ""}}
 @page:left {margin-right:${mode === "cover" ? 0 : e.margin + e.gutter}in} @page:right {margin-left:${mode === "cover" ? 0 : e.margin + e.gutter}in}
 *{box-sizing:border-box} body{margin:0;color:#222;font-family:'${e.font}',serif;font-size:${e.fontSize}pt;line-height:${e.lineHeight}}
 img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%;break-inside:avoid}td,th{border:1px solid #aaa;padding:6pt;text-align:left}figure{margin:1em 0;break-inside:avoid}figcaption{font-size:.85em}pre{white-space:pre-wrap} h1,h2,h3{color:${e.accent};line-height:1.2;break-after:avoid} h1{font-size:2em} p{margin:0 0 ${e.paragraphSpacing}pt;text-indent:${e.indent}in;orphans:3;widows:3} blockquote{border-left:2pt solid ${e.accent};padding-left:1em} .chapter,.title-page,.contents{break-before:page} .title-page{padding-top:20%;text-align:center} a{color:inherit} .contents a{display:block;margin:1em 0} .running{font-size:9pt;color:#555} .cover-wrap{display:flex;width:max-content;break-after:page} .cover-panel{position:relative;overflow:hidden;flex-shrink:0} .cover-panel img{position:absolute;width:100%;height:100%;object-fit:cover;inset:0} .cover-copy{position:relative;padding:.65in;height:100%;display:flex;flex-direction:column} .cover-copy h1,.cover-copy h2{color:inherit} .cover-copy p{white-space:normal;text-indent:0} .cover-author{margin-top:auto} .spine{display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}.spine span{writing-mode:vertical-rl;white-space:nowrap;font-size:12pt}
 @media screen {body{background:#ecece8;padding:24px}.print-content{background:white;max-width:${width}in;margin:auto;padding:${mode === "cover" ? 0 : e.margin}in;box-shadow:0 2px 20px #0001}.chapter{padding-top:1em}.cover-wrap{margin:auto}.print-help{font:14px system-ui;text-align:center;margin-bottom:20px}} @media print{.print-help{display:none}.print-content{padding:0}.running{position:fixed;top:-.4in}}
 </style></head><body><div class="print-help">Use your browser’s Print → Save as PDF. Set scale to 100%, disable browser headers and footers, and use the document’s custom paper size. Proof against your printer’s template.</div>${mode === "cover" ? coverHtml(p, true) : `<main class="print-content"><div class="running">${h(e.runningHeader)}</div><section class="title-page"><h1>${h(p.book.title)}</h1><h2>${h(p.book.subtitle ?? "")}</h2><p>${h(e.author)}</p><p>${h(e.name)}</p><p>${h(e.publisher)}</p><p>${h(e.copyright)}</p>${e.isbn ? `<p>ISBN ${h(e.isbn)}</p>` : ""}</section>${e.toc ? `<nav class="contents"><h1>Contents</h1>${p.nodes.map((n) => `<a href="#n-${n.id}">${h(n.title)}</a>`).join("")}</nav>` : ""}${sections}</main>`}</body></html>`;
}
