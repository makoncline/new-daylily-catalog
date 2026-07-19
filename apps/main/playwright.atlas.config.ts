import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
const baseURL = process.env.BASE_URL ?? "http://localhost:3210";
const outputRoot = process.env.ATLAS_OUTPUT_DIR ?? "local/atlas/current";
const authState =
  process.env.ATLAS_AUTH_STATE ?? path.join(outputRoot, ".auth/member.json");
export default defineConfig({
  testDir: "./tests/atlas",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  outputDir:
    process.env.ATLAS_PLAYWRIGHT_RESULTS_DIR ??
    path.join(outputRoot, "playwright-results"),
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder:
          process.env.ATLAS_PLAYWRIGHT_REPORT_DIR ??
          path.join(outputRoot, "playwright-report"),
      },
    ],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    viewport: { width: 1440, height: 1000 },
    screenshot: "off",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "anonymous",
      testMatch: [
        "public-catalog.atlas.ts",
        "cultivar-search.atlas.ts",
        "onboarding-membership.atlas.ts",
        "buyer-inquiry.atlas.ts",
      ],
    },
    {
      name: "member-auth",
      testMatch: "member-auth.setup.ts",
    },
    {
      name: "member",
      testMatch: [
        "dashboard-home.atlas.ts",
        "listing-management.atlas.ts",
        "listing-media.atlas.ts",
        "list-management.atlas.ts",
        "profile-management.atlas.ts",
        "tag-printing.atlas.ts",
      ],
      dependencies: ["member-auth"],
      use: { storageState: authState },
    },
  ],
});
