import { defineConfig, devices } from "@playwright/test";

// Use deploy preview URL in CI, localhost for local development
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    bypassCSP: true,
    ...(process.env.VERCEL_PROTECTION_BYPASS
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass": process.env.VERCEL_PROTECTION_BYPASS,
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
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
      },
});
