import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120000,
  use: {
    baseURL: process.env.AUTHORHUB_TEST_URL ?? "http://localhost:3000",
    headless: true,
  },
  workers: 1,
  reporter: "list",
});
