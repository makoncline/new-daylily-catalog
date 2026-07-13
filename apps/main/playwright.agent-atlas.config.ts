import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const baseURL = process.env.AGENT_ATLAS_BASE_URL ?? "http://localhost:3012";
const artifactRoot = path.join(process.cwd(), "local", "agent-atlas");

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
      testMatch: "authenticated.atlas.ts",
      dependencies: ["auth-setup"],
      use: {
        storageState: path.join(artifactRoot, ".auth", "rolling-oaks.json"),
      },
    },
    {
      name: "plant-fancy-gardens",
      testMatch: "authenticated.atlas.ts",
      dependencies: ["auth-setup"],
      use: {
        storageState: path.join(
          artifactRoot,
          ".auth",
          "plant-fancy-gardens.json",
        ),
      },
    },
  ],
});
