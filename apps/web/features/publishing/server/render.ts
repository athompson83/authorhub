import chromium from "@sparticuz/chromium";
import { chromium as browserEngine } from "playwright-core";
import { publicationHtml, type Publication } from "../publication";
import { epub, docx } from "../exports";
import type { ArtifactFormat } from "../artifact-format";
export async function renderArtifact(
  publication: Publication,
  releaseId: string,
  format: ArtifactFormat,
): Promise<Uint8Array> {
  if (format === "epub") return epub(publication, releaseId);
  if (format === "docx")
    return new Uint8Array(await (await docx(publication)).arrayBuffer());
  if (format === "backup")
    return new TextEncoder().encode(JSON.stringify(publication, null, 2));
  const html = publicationHtml(
    publication,
    format.startsWith("cover") ? "cover" : "interior",
  );
  if (format.endsWith("html")) return new TextEncoder().encode(html);
  // The same packaged Chromium binary is exercised locally and in production.
  const browser = await browserEngine.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) => route.abort());
    await page.setContent(html, { waitUntil: "load", timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
    });
  } finally {
    await browser.close();
  }
}
