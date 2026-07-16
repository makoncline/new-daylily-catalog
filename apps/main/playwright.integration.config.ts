import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.APP_BASE_URL ?? "http://localhost:3210";
const port = new URL(baseURL).port;

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
  webServer: {
    command: `pnpm exec next dev --hostname localhost --port ${port}`,
    cwd: ".",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
