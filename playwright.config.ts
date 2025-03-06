import { defineConfig, devices } from "@playwright/test";
import { execSync } from "child_process";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    bypassCSP: true,
    ...devices["Desktop Chrome"],
  },

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run env:test -- npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },

  /* Before running tests, initialize the test database */
  globalSetup: "./tests/global-setup.ts",
});
