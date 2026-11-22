import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/releases/*/exports": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};
export default config;
