import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1, // Run tests serially to avoid port conflicts
  timeout: 120000, // 2 minutes per test
  use: {
    screenshot: "only-on-failure",
    bypassCSP: true,
    ...devices["Desktop Chrome"],
  },
});
