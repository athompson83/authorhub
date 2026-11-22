import { z } from "zod";
export const artifactFormat = z.enum([
  "epub",
  "docx",
  "interior_pdf",
  "cover_pdf",
  "interior_html",
  "cover_html",
  "backup",
]);
export type ArtifactFormat = z.infer<typeof artifactFormat>;
export const artifactTypes: Record<
  ArtifactFormat,
  { extension: string; mime: string }
> = {
  epub: { extension: "epub", mime: "application/epub+zip" },
  docx: {
    extension: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  interior_pdf: { extension: "pdf", mime: "application/pdf" },
  cover_pdf: { extension: "pdf", mime: "application/pdf" },
  interior_html: { extension: "html", mime: "text/html" },
  cover_html: { extension: "html", mime: "text/html" },
  backup: { extension: "json", mime: "application/json" },
};
