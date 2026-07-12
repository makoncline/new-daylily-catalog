import { defineConfig, devices } from "@playwright/test";

// Keep managed test servers separate from the long-lived exploratory app on 3200.
const port = process.env.INTEGRATION_PORT ?? "3210";
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/app",
  testMatch: "**/*.app.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "local/integration/report", open: "never" }],
  ],
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "pnpm exec tsx scripts/run-integration-local.ts",
        url: `${baseURL}/api/runtime-config`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: port,
          HERMETIC_DB_NAME: `integration-playwright-${process.pid}.sqlite`,
        },
      },
});
