import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Use deploy preview URL in CI, otherwise start a local server on a dedicated port
const e2ePort = process.env.E2E_PORT ?? "3100";
const baseURL = process.env.BASE_URL ?? `http://localhost:${e2ePort}`;

// If not attaching to a remote BASE_URL, pre-provision env for a temp DB
if (!process.env.BASE_URL) {
  const tmpDir = path.join(process.cwd(), "tests", ".tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  if (!process.env.LOCAL_DATABASE_URL) {
    const file = `pw-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`;
    const abs = path.join(tmpDir, file);
    process.env.LOCAL_DATABASE_URL = `file:${abs}`;
  }

  process.env.USE_TURSO_DB = "false";
  process.env.SKIP_ENV_VALIDATION = "1";
  process.env.PLAYWRIGHT_LOCAL_E2E = "true";

  // Ensure the DB file exists with schema and is empty before server starts
  const dbFile = process.env.LOCAL_DATABASE_URL!.replace(/^file:/, "");
  const templateDb = path.join(process.cwd(), "prisma", "db-dev.sqlite");
  if (fs.existsSync(templateDb)) {
    try {
      fs.copyFileSync(templateDb, dbFile);
      // Best-effort: clear all tables via sqlite3 CLI to start empty
      const sql = `PRAGMA foreign_keys=OFF; BEGIN; \
DELETE FROM "Image"; \
DELETE FROM "Listing"; \
DELETE FROM "List"; \
DELETE FROM "UserProfile"; \
DELETE FROM "AhsListing"; \
DELETE FROM "KeyValue"; \
DELETE FROM "User"; \
COMMIT; PRAGMA foreign_keys=ON;`;
      spawnSync("sqlite3", [dbFile, sql], { stdio: "ignore" });
    } catch {
      // ignore and let globalSetup clear instead
    }
  }
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.{ts,tsx}",
  // Use global setup/teardown to provision a temp DB when BASE_URL is not set
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    bypassCSP: true,
    ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass":
              process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          },
        }
      : {}),
    ...devices["Desktop Chrome"],
  },

  /* Run your local dev server before starting the tests */
  // Only start webServer for local development (when BASE_URL is not set)
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: `http://localhost:${e2ePort}`,
        // Always start a fresh server for local e2e to ensure a clean DB + env
        reuseExistingServer: false,
        env: {
          ...process.env,
          PORT: e2ePort,
          USE_TURSO_DB: "false",
          LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL,
          SKIP_ENV_VALIDATION: "1",
          PLAYWRIGHT_LOCAL_E2E: "true",
        },
      },
});
