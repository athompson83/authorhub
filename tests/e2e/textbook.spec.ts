import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.setTimeout(240000);
test("author writes, versions, designs and exports a textbook", async ({
  page,
  request,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
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
    .setInputFiles("tests/fixtures/figure.png");
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
  await page.getByText(/Source library & references/).click();
  await page
    .getByLabel("Source title", { exact: true })
    .fill("Ecology field reference");
  await page.getByLabel("Source author", { exact: true }).fill("R. Scholar");
  await page.getByLabel("Publication year", { exact: true }).fill("2026");
  await page
    .getByLabel("Source URL", { exact: true })
    .fill("https://example.org/ecology");
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Source saved." }),
  ).toBeVisible();
  await editor.press("Control+End");
  await editor.press("Enter");
  await editor.pressSequentially("Supporting details. ");
  await page
    .getByLabel("Citation source")
    .selectOption({ label: "Ecology field reference" });
  page.once("dialog", (dialog) => dialog.accept("p. 12"));
  await page
    .getByRole("button", { name: "Insert citation", exact: true })
    .click();
  page.once("dialog", (dialog) =>
    dialog.accept("Energy transfer is measured in joules."),
  );
  await page
    .getByRole("button", { name: "Footnote / note", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept("E=mc^2"));
  await page.getByRole("button", { name: "Equation", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept("\\frac{a^2}{b}"));
  await page
    .getByRole("button", { name: "Display equation", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "All changes saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(editor.locator("sup[data-footnote]")).toBeVisible();
  await expect(editor.locator("cite[data-citation]")).toBeVisible();
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
  await page.getByLabel("ISBN-13 (optional)").fill("9780306406157");
  await page
    .getByLabel("Copyright / rights")
    .fill("Copyright 2026 Morgan Reed. All rights reserved.");
  await page.getByRole("button", { name: "Save edition", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Edition saved.");
  await expect(
    page
      .getByRole("combobox", { name: "Edition", exact: true })
      .locator("option"),
  ).toHaveCount(2);
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
  let backupFile = "";
  for (const name of [
    "Download EPUB",
    "Download DOCX",
    "Download interior PDF",
    "Download cover PDF",
    "Download print interior HTML",
    "Download cover wrap HTML",
    "Download release backup",
  ]) {
    const promise = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const download = await promise;
    await download.saveAs(testInfo.outputPath(download.suggestedFilename()));
    if (name === "Download release backup")
      backupFile = testInfo.outputPath(download.suggestedFilename());
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
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/library");
  await page.getByText("Import a backup or text manuscript").click();
  await page.getByLabel("Import book file").setInputFiles(backupFile);
  await expect(
    page.getByRole("status").filter({ hasText: "Import complete." }),
  ).toBeVisible({ timeout: 60000 });
  await page
    .getByRole("link", { name: "Open imported book", exact: true })
    .click();
  await expect(editor).toContainText("Energy flows through ecosystems.");
  await expect(editor.locator('img[alt="A green leaf diagram"]')).toBeVisible();
  await expect(editor.locator("sup[data-footnote]")).toBeVisible();
  await expect(editor.locator("cite[data-citation]")).toBeVisible();
  await page.getByRole("link", { name: "Book settings", exact: true }).click();
  await page
    .getByLabel("Book title", { exact: true })
    .fill("Restored ecology edition");
  await page
    .getByRole("button", { name: "Save book settings", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Book settings saved." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Archive book", exact: true }).click();
  await expect(page).toHaveURL(/status=archived/);
  await expect(
    page.getByText("Restored ecology edition", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Book settings", exact: true }).click();
  await page.getByRole("button", { name: "Restore book", exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByText("Restored ecology edition", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("article")
    .filter({ hasText: "Restored ecology edition" })
    .getByRole("link", { name: "Book settings", exact: true })
    .click();
  await page
    .getByLabel("Type “Restored ecology edition” to confirm")
    .fill("Restored ecology edition");
  await page
    .getByRole("button", { name: "Permanently delete book", exact: true })
    .click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByText("Restored ecology edition", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Account settings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Account settings", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/sign-in/);
  await page.goto("/library");
  await expect(page).toHaveURL(/sign-in/);
  // The intentional stale-save assertion above emits this Chromium network message.
  expect(
    browserErrors.filter(
      (message) =>
        message !==
        "Failed to load resource: the server responded with a status of 409 (Conflict)",
    ),
  ).toEqual([]);
});
