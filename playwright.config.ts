import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "playwright/.clerk/user.json");

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  globalSetup: "./tests/global-setup.ts",
  use: {
    ...devices["Desktop Chrome"],
    screenshot: "only-on-failure",
    bypassCSP: true,
  },
});
