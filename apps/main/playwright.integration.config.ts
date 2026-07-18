import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.APP_BASE_URL ?? "http://localhost:3210";
const port = new URL(baseURL).port;
const providerURL =
  process.env.INTEGRATION_PROVIDER_URL ?? "http://127.0.0.1:3211";
const appReadyURL = `${baseURL}/api/trpc/public.getPublicProfiles?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D`;

export default defineConfig({
  testDir: "./tests/integration",
  testMatch: "**/*.integration.ts",
  outputDir: "./tests/.tmp/integration-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
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
      command: `pnpm exec next dev --hostname localhost --port ${port}`,
      cwd: ".",
      url: appReadyURL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
