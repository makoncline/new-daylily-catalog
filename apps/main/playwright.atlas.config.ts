import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
const baseURL = process.env.BASE_URL ?? "http://localhost:3210";
const outputRoot = process.env.ATLAS_OUTPUT_DIR ?? "local/atlas/current";
export default defineConfig({
  testDir: "./tests/atlas",
  testMatch: "**/*.atlas.ts",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  outputDir:
    process.env.ATLAS_PLAYWRIGHT_RESULTS_DIR ??
    path.join(outputRoot, "playwright-results"),
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder:
          process.env.ATLAS_PLAYWRIGHT_REPORT_DIR ??
          path.join(outputRoot, "playwright-report"),
      },
    ],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: { width: 1440, height: 1000 },
    screenshot: "off",
    trace: "retain-on-failure",
  },
});
