import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { getAtlasRoot } from "./scripts/agent-atlas-paths.mjs";

delete process.env.NO_COLOR;

const baseURL = process.env.AGENT_ATLAS_BASE_URL ?? "http://localhost:3012";
const artifactRoot = getAtlasRoot(process.cwd());

export default defineConfig({
  testDir: "./tests/agent-atlas",
  outputDir: path.join(artifactRoot, "test-results"),
  reporter: [
    ["list"],
    [
      "html",
      { open: "never", outputFolder: path.join(artifactRoot, "report") },
    ],
  ],
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    bypassCSP: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "auth-setup",
      testMatch: "auth.setup.ts",
    },
    {
      name: "anonymous-desktop",
      testMatch: [
        "public*.atlas.ts",
        "onboarding.atlas.ts",
        "diagnostics.atlas.ts",
      ],
      grepInvert: /@mobile/,
    },
    {
      name: "anonymous-mobile",
      testMatch: "public*.atlas.ts",
      grep: /@mobile/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "rolling-oaks",
      testMatch: [
        "authenticated.atlas.ts",
        "listings-next.atlas.ts",
        "member-*.atlas.ts",
      ],
      dependencies: ["auth-setup"],
      use: {
        storageState: path.join(artifactRoot, ".auth", "rolling-oaks.json"),
      },
    },
    {
      name: "plant-fancy-gardens",
      testMatch: [
        "authenticated.atlas.ts",
        "listings-next.atlas.ts",
        "member-*.atlas.ts",
      ],
      dependencies: ["auth-setup"],
      use: {
        storageState: path.join(
          artifactRoot,
          ".auth",
          "plant-fancy-gardens.json",
        ),
      },
    },
    {
      name: "rolling-oaks-mobile",
      testMatch: "member-responsive.atlas.ts",
      dependencies: ["auth-setup"],
      use: {
        storageState: path.join(artifactRoot, ".auth", "rolling-oaks.json"),
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "rolling-oaks-ipad",
      testMatch: "member-responsive.atlas.ts",
      dependencies: ["auth-setup"],
      use: {
        storageState: path.join(artifactRoot, ".auth", "rolling-oaks.json"),
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 1366 },
        deviceScaleFactor: 2,
        hasTouch: true,
      },
    },
    ...[
      "new-unpaid",
      "billing-past-due",
      "billing-canceled",
      "free-at-limit",
      "profile-editor",
    ].map((name) => ({
      name: `hermetic-${name}`,
      testMatch: "member-account-states.atlas.ts",
      dependencies: ["auth-setup"],
      use: {
        storageState: path.join(artifactRoot, ".auth", `${name}.json`),
      },
    })),
  ],
});
