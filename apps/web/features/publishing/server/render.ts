import chromium from "@sparticuz/chromium";
import { loadPublicationFonts } from "./fonts";
import { chromium as browserEngine } from "playwright-core";
import { publicationHtml, type Publication } from "../publication";
import { epub, docx } from "../exports";
import type { ArtifactFormat } from "../artifact-format";
// Fluid runtimes can start several exports together. Chromium creates its
// output file before extraction finishes; share that first extraction promise
// so another request cannot try to execute a partially written binary.
let executable: Promise<string> | undefined;
function chromiumExecutable() {
  executable ??= chromium.executablePath().catch((error) => {
    executable = undefined;
    throw error;
  });
  return executable;
}
export async function renderArtifact(
  publication: Publication,
  releaseId: string,
  format: ArtifactFormat,
  onStage: (stage: string) => void = () => {},
): Promise<Uint8Array> {
  if (format === "epub")
    return epub(
      publication,
      releaseId,
      await loadPublicationFonts(publication.edition.font),
    );
  if (format === "docx")
    return new Uint8Array(await (await docx(publication)).arrayBuffer());
  if (format === "backup")
    return new TextEncoder().encode(JSON.stringify(publication, null, 2));
  let html = publicationHtml(
    publication,
    format.startsWith("cover") ? "cover" : "interior",
  );
  for (const font of await loadPublicationFonts(publication.edition.font)) {
    if (font.mediaType === "text/plain")
      html = html.replace(
        "<style>",
        `<style>/* ${new TextDecoder().decode(font.bytes).replaceAll("*/", "* /")} */`,
      );
    else
      html = html.replaceAll(
        `/fonts/${font.filename}`,
        `data:${font.mediaType};base64,${Buffer.from(font.bytes).toString("base64")}`,
      );
  }
  if (format.endsWith("html")) return new TextEncoder().encode(html);
  // The same packaged Chromium binary is exercised locally and in production.
  onStage("extract");
  const executablePath = await chromiumExecutable();
  onStage("launch");
  const browser = await browserEngine.launch({
    executablePath,
    args: chromium.args,
    headless: true,
  });
  try {
    onStage("page");
    const page = await browser.newPage();
    await page.route("**/*", (route) => route.abort());
    onStage("content");
    await page.setContent(html, { waitUntil: "load", timeout: 45000 });
    onStage("fonts");
    await page.evaluate(() => document.fonts.ready);
    onStage("pdf");
    return await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
    });
  } finally {
    onStage("close");
    await browser.close();
    onStage("closed");
  }
}
