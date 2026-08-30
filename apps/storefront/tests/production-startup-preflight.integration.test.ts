import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const preflightPath = fileURLToPath(
  new URL("../scripts/production-startup-preflight.mjs", import.meta.url),
);
const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  STOREFRONT_API_BASE_URL: "https://daylilycatalog.com",
  STOREFRONT_DATA_SOURCE: "remote",
  STOREFRONT_HOSTNAME: "rolling-oaks-daylilies.makon.dev",
  STOREFRONT_INQUIRY_ADAPTER: "remote",
  STOREFRONT_INQUIRY_TOKEN: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
  STOREFRONT_SELLER_ID: "3",
  STOREFRONT_SITE_KEY: "rolling-oaks",
};

function runPreflight(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  const environment: NodeJS.ProcessEnv = {
    ...validProductionEnvironment,
    ...overrides,
    NODE_ENV: overrides.NODE_ENV ?? "production",
  };
  return spawnSync(process.execPath, [preflightPath], {
    encoding: "utf8",
    env: environment,
  });
}

describe("production startup preflight", () => {
  it("lets a complete approved remote storefront configuration start", () => {
    const result = runPreflight();

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it.each([
    ["production mode", { NODE_ENV: "development" }, "NODE_ENV"],
    ["site key", { STOREFRONT_SITE_KEY: "" }, "STOREFRONT_SITE_KEY"],
    [
      "approved site key",
      { STOREFRONT_SITE_KEY: "unknown-site" },
      "STOREFRONT_SITE_KEY",
    ],
    ["hostname", { STOREFRONT_HOSTNAME: "" }, "STOREFRONT_HOSTNAME"],
    [
      "approved hostname",
      { STOREFRONT_HOSTNAME: "other.example.test" },
      "STOREFRONT_HOSTNAME",
    ],
    ["seller ID", { STOREFRONT_SELLER_ID: "" }, "STOREFRONT_SELLER_ID"],
    [
      "approved seller ID",
      { STOREFRONT_SELLER_ID: "4" },
      "STOREFRONT_SELLER_ID",
    ],
    [
      "remote data mode",
      { STOREFRONT_DATA_SOURCE: "fixture" },
      "STOREFRONT_DATA_SOURCE",
    ],
    ["API URL", { STOREFRONT_API_BASE_URL: "" }, "STOREFRONT_API_BASE_URL"],
    [
      "absolute API URL",
      { STOREFRONT_API_BASE_URL: "not-a-url" },
      "STOREFRONT_API_BASE_URL",
    ],
    [
      "HTTPS API URL",
      { STOREFRONT_API_BASE_URL: "http://daylilycatalog.com" },
      "STOREFRONT_API_BASE_URL",
    ],
    [
      "remote inquiry mode",
      { STOREFRONT_INQUIRY_ADAPTER: "stub" },
      "STOREFRONT_INQUIRY_ADAPTER",
    ],
    [
      "inquiry token",
      { STOREFRONT_INQUIRY_TOKEN: "" },
      "STOREFRONT_INQUIRY_TOKEN",
    ],
    [
      "canonical inquiry token",
      { STOREFRONT_INQUIRY_TOKEN: "test-token" },
      "STOREFRONT_INQUIRY_TOKEN",
    ],
  ] satisfies ReadonlyArray<
    readonly [string, Partial<NodeJS.ProcessEnv>, string]
  >)("stops before startup without a valid %s", (_label, overrides, name) => {
    const result = runPreflight(overrides);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Storefront startup preflight failed:");
    expect(result.stderr).toContain(name);
  });
});
