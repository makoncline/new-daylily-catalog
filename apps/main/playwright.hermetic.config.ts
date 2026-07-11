import { defineConfig, devices } from "@playwright/test";

const port = process.env.HERMETIC_PORT ?? "3200";
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/app",
  testMatch: "**/*.app.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "local/hermetic/report", open: "never" }],
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
        command: "pnpm hermetic:dev",
        url: `${baseURL}/api/runtime-config`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: port,
          HERMETIC_DB_NAME: `hermetic-playwright-${process.pid}.sqlite`,
        },
      },
});
