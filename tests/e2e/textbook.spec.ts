import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("author writes, versions, designs and exports a textbook", async ({
  page,
  request,
}, testInfo) => {
  const api =
    process.env.AUTHORHUB_TEST_SUPABASE_URL ?? "http://localhost:55430";
  const email = `author-${Date.now()}@example.test`,
    password = "Disposable-Test-Password-123!";
  const signup = await request.post(`${api}/auth/v1/signup`, {
    headers: {
      apikey:
        process.env.AUTHORHUB_TEST_SUPABASE_KEY ?? "local-disposable-test-key",
    },
    data: { email, password },
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/library/);
  await page
    .getByLabel("Title", { exact: true })
    .fill("Foundations of Ecology");
  await page
    .getByLabel("Subtitle", { exact: true })
    .fill("A field guide for students");
  await page.getByRole("button", { name: "Create book", exact: true }).click();
  await expect(page).toHaveURL(/books\//);
  await page.getByLabel("New chapter title").fill("1. Ecosystems");
  await page.getByRole("button", { name: "+ Add chapter" }).click();
  const editor = page.getByRole("textbox", {
    name: "Chapter manuscript editor",
  });
  await expect(editor).toBeVisible();
  await editor.fill("Energy flows through ecosystems.");
  await expect(
    page.getByRole("status").filter({ hasText: "All changes saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(editor).toContainText("Energy flows through ecosystems.");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(editor.locator("table")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "All changes saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(editor.locator("table")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept("A green leaf diagram"));
  await page
    .getByLabel("Insert figure")
    .setInputFiles({
      name: "leaf.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(editor.locator('img[alt="A green leaf diagram"]')).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "All changes saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(editor.locator('img[alt="A green leaf diagram"]')).toBeVisible();
  const ids = await editor
    .locator("[data-block-id]")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-block-id")));
  expect(new Set(ids).size).toBe(ids.length);
  await page.getByLabel("Snapshot name").fill("Before peer review");
  await page
    .getByRole("button", { name: "Save snapshot", exact: true })
    .click();
  await expect(page.getByText("Before peer review · version")).toBeVisible();
  const nodeId = new URL(page.url()).searchParams.get("node")!;
  const conflict = await page.evaluate(async (node) => {
    const response = await fetch(`/api/manuscript/nodes/${node}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version: 1,
        content: { version: 1, type: "doc", content: [] },
      }),
    });
    return response.status;
  }, nodeId);
  expect(conflict).toBe(409);
  const firstVersion = await page
    .getByLabel("Compare revision")
    .locator("option")
    .filter({ hasText: /^Version 1 ·/ })
    .getAttribute("value");
  await page.getByLabel("Compare revision").selectOption(firstVersion!);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Restore as new version" }).click();
  await expect(editor).not.toContainText("Energy flows through ecosystems.");
  // Restore the populated draft again, retaining both versions.
  await page
    .getByRole("button", { name: /Before peer review · version/ })
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Restore as new version" }).click();
  await expect(editor).toContainText("Energy flows through ecosystems.");
  await expect(editor.locator('img[alt="A green leaf diagram"]')).toBeVisible();
  await page.getByRole("link", { name: "Cover, interior & publish" }).click();
  await page.getByLabel("Author / contributors").fill("Dr. Morgan Reed");
  await page
    .getByLabel("Copyright / rights")
    .fill("Copyright 2026 Morgan Reed. All rights reserved.");
  await page.getByRole("button", { name: "Save edition", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Edition saved.");
  await page.getByRole("button", { name: "Interior", exact: true }).click();
  await page.getByLabel("Body font size").fill("12");
  await page.getByRole("button", { name: "Cover", exact: true }).click();
  await page
    .getByLabel("Back cover copy")
    .fill("Explore the living systems that connect our planet.");
  await page.getByLabel("Spine text").fill("FOUNDATIONS OF ECOLOGY · REED");
  await page.getByRole("button", { name: "Save edition", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Edition saved.");
  await page.screenshot({
    path: testInfo.outputPath("cover-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Release", exact: true }).click();
  await page.getByRole("button", { name: "Freeze publication copy" }).click();
  await expect(page.getByLabel("Frozen release").locator("option")).toHaveCount(
    2,
  );
  await page.getByLabel("Frozen release").selectOption({ index: 1 });
  for (const name of [
    "Download EPUB",
    "Download DOCX",
    "Download print interior (HTML → PDF)",
    "Download cover wrap (HTML → PDF)",
    "Download release backup",
  ]) {
    const promise = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const download = await promise;
    await download.saveAs(testInfo.outputPath(download.suggestedFilename()));
    if (name.includes("HTML")) {
      const html = await readFile((await download.path())!, "utf8");
      const print = await page.context().newPage();
      await print.setContent(html);
      const pdf = await print.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        path: testInfo.outputPath(
          name.includes("wrap") ? "cover.pdf" : "interior.pdf",
        ),
      });
      expect(pdf.length).toBeGreaterThan(1000);
      await print.close();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("studio-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
