import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const e2ePort = process.env.E2E_PORT ?? "3100";
const baseURL = process.env.BASE_URL ?? `http://localhost:${e2ePort}`;

// Pre-provision temp DB path when running locally (not attaching to BASE_URL)
// DB template copy and clearing is handled by global-setup.ts
if (!process.env.BASE_URL) {
  const tmpDir = path.join(process.cwd(), "tests", ".tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  const existingUrl = process.env.LOCAL_DATABASE_URL;
  const isTempDb =
    existingUrl &&
    existingUrl.startsWith("file:") &&
    existingUrl
      .replace(/^file:/, "")
      .startsWith(path.join(process.cwd(), "tests", ".tmp"));

  if (!existingUrl || !isTempDb) {
    const file = `pw-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`;
    const abs = path.join(tmpDir, file);
    process.env.LOCAL_DATABASE_URL = `file:${abs}`;
  }

  process.env.E2E_TEST_DB_URL = process.env.LOCAL_DATABASE_URL;
  process.env.USE_TURSO_DB = "false";
  process.env.SKIP_ENV_VALIDATION = "1";
  process.env.PLAYWRIGHT_LOCAL_E2E = "true";
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.{ts,tsx}",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // Single worker for local mode (shared temp DB); allow parallelization in attach mode
  workers: process.env.BASE_URL ? undefined : 1,
  // Tag rules:
  // - @preview runs only on preview (BASE_URL set)
  // - @local runs only locally (BASE_URL not set)
  // - untagged runs in both
  grepInvert: process.env.BASE_URL ? /@local/ : /@preview/,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    bypassCSP: true,
    ...devices["Desktop Chrome"],
  },

  /* Run your local dev server before starting the tests */
  // Only start webServer for local development (when BASE_URL is not set)
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command:
          "npx tsx scripts/create-temp-db.ts --db $E2E_TEST_DB_URL && npm run dev",
        url: `http://localhost:${e2ePort}`,
        reuseExistingServer: false,
        timeout: 120000, // 2 minutes for CI (server startup can be slow)
        env: {
          ...process.env,
          PORT: e2ePort,
          USE_TURSO_DB: "false",
          LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL!,
          E2E_TEST_DB_URL: process.env.E2E_TEST_DB_URL!,
          SKIP_ENV_VALIDATION: "1",
          PLAYWRIGHT_LOCAL_E2E: "true",
        },
      },
});
