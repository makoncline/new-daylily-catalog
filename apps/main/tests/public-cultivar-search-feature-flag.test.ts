// @vitest-environment node

import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";
import {
  getHomeMarkdown,
  getLlmsTxt,
  getOpenApiDocument,
} from "@/lib/agent-readiness";

const originalRuntimeFlagsPath = process.env.RUNTIME_FEATURE_FLAGS_PATH;
const originalVercel = process.env.VERCEL;
const baseUrl = "https://daylilycatalog.com";
const runtimeFlagsPath = join(
  tmpdir(),
  `daylily-public-feature-flags-${process.pid}.json`,
);

describe("public cultivar search feature flag", () => {
  beforeEach(() => {
    process.env.RUNTIME_FEATURE_FLAGS_PATH = runtimeFlagsPath;
    writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":false}');
    delete process.env.VERCEL;
  });

  afterAll(() => {
    if (originalRuntimeFlagsPath === undefined) {
      delete process.env.RUNTIME_FEATURE_FLAGS_PATH;
    } else {
      process.env.RUNTIME_FEATURE_FLAGS_PATH = originalRuntimeFlagsPath;
    }
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
    rmSync(runtimeFlagsPath, { force: true });
  });

  it("defaults off without a runtime file", () => {
    rmSync(runtimeFlagsPath, { force: true });

    expect(isPublicCultivarSearchEnabled()).toBe(false);
    expect(getLlmsTxt(baseUrl)).not.toContain("/api/v1/cultivars/search");
    expect(getHomeMarkdown(baseUrl)).not.toContain("/api/v1/cultivars/search");
    expect(getOpenApiDocument(baseUrl).paths).not.toHaveProperty(
      "/api/v1/cultivars/search",
    );
  });

  it("restores search discovery only from the runtime file", () => {
    writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":true}');

    expect(isPublicCultivarSearchEnabled()).toBe(true);
    expect(getLlmsTxt(baseUrl)).toContain("/api/v1/cultivars/search");
    expect(getHomeMarkdown(baseUrl)).toContain("/api/v1/cultivars/search");
    expect(getOpenApiDocument(baseUrl).paths).toHaveProperty(
      "/api/v1/cultivars/search",
    );

    writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":false}');
    expect(isPublicCultivarSearchEnabled()).toBe(false);
  });

  it("keeps every public surface disabled on unsupported deployments", () => {
    writeFileSync(runtimeFlagsPath, '{"publicCultivarSearch":true}');
    process.env.VERCEL = "1";

    expect(isPublicCultivarSearchEnabled()).toBe(false);
    expect(getLlmsTxt(baseUrl)).not.toContain("/api/v1/cultivars/search");
    expect(getOpenApiDocument(baseUrl).paths).not.toHaveProperty(
      "/api/v1/cultivars/search",
    );
  });
});
