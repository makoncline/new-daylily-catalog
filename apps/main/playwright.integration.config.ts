import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.APP_BASE_URL ?? "http://localhost:3210";
const port = new URL(baseURL).port;
const providerURL =
  process.env.INTEGRATION_PROVIDER_URL ?? "http://127.0.0.1:3211";
const libsql = process.env.DATABASE_URL?.startsWith("libsql://");
const readyProcedure = libsql
  ? "user.getCurrentUser"
  : "public.getPublicProfiles";
const appReadyURL = `${baseURL}/api/trpc/${readyProcedure}?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D`;
const evidenceDirectory = process.env.INTEGRATION_EVIDENCE_DIR;

export default defineConfig({
  testDir: "./tests/integration",
  testMatch: libsql
    ? "**/listing-save-recovery.integration.ts"
    : "**/*.integration.ts",
  outputDir: evidenceDirectory
    ? `${evidenceDirectory}/private/results`
    : "./tests/.tmp/integration-results",
  testIgnore: libsql ? undefined : "**/listing-save-recovery.integration.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: evidenceDirectory
    ? [
        ["list"],
        [
          "./scripts/integration-evidence-reporter.ts",
          { directory: evidenceDirectory },
        ],
      ]
    : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: evidenceDirectory
      ? { mode: "on", size: { width: 1024, height: 874 } }
      : "off",
  },
  webServer: [
    {
      command: "node scripts/run-integration-provider-server.mjs",
      cwd: ".",
      url: `${providerURL}/__health`,
      reuseExistingServer: false,
      timeout: 15_000,
      stdout: "pipe",
    },
    {
      command: `pnpm exec next dev --hostname localhost --port ${port} > '${(evidenceDirectory ? `${evidenceDirectory}/private/server.log` : "tests/.tmp/integration-server.log").replaceAll("'", "'\\''")}' 2>&1`,
      cwd: ".",
      url: appReadyURL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
