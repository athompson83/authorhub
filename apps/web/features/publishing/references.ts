import type { ManuscriptBlock, ManuscriptInline } from "@authorhub/manuscript";
import type { BookSource } from "../references/schema";
export type ReferenceContext = {
  sources: Map<string, BookSource>;
  citations: Map<string, number>;
  notes: Map<string, { number: number; text: string }>;
};
export function referenceContext(
  nodes: { content: { content: ManuscriptBlock[] } }[],
  sources: BookSource[] = [],
): ReferenceContext {
  const context: ReferenceContext = {
    sources: new Map(sources.map((s) => [s.id, s])),
    citations: new Map(),
    notes: new Map(),
  };
  function visit(node: ManuscriptBlock | ManuscriptInline) {
    if (node.type === "citation" && !context.citations.has(node.attrs.sourceId))
      context.citations.set(node.attrs.sourceId, context.citations.size + 1);
    if (node.type === "footnote" && !context.notes.has(node.attrs.noteId))
      context.notes.set(node.attrs.noteId, {
        number: context.notes.size + 1,
        text: node.attrs.text,
      });
    if ("content" in node) node.content?.forEach(visit);
  }
  nodes.forEach((node) => node.content.content.forEach(visit));
  return context;
}
export function citationText(
  sourceId: string,
  locator: string,
  context: ReferenceContext,
) {
  return `[${context.citations.get(sourceId) ?? "?"}${locator ? `, ${locator}` : ""}]`;
}
export function bibliographyText(source: BookSource) {
  return `${source.author ? `${source.author}. ` : ""}${source.year ? `(${source.year}). ` : ""}${source.title}.${source.publisher ? ` ${source.publisher}.` : ""}${source.doi ? ` https://doi.org/${source.doi.replace(/^https?:\/\/doi.org\//, "")}` : source.url ? ` ${source.url}` : ""}`;
}
