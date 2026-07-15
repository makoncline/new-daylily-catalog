// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";
import {
  getHomeMarkdown,
  getLlmsTxt,
  getOpenApiDocument,
} from "@/lib/agent-readiness";

const originalValue = process.env.PUBLIC_CULTIVAR_SEARCH_ENABLED;
const baseUrl = "https://daylilycatalog.com";

describe("public cultivar search feature flag", () => {
  afterEach(() => {
    process.env.PUBLIC_CULTIVAR_SEARCH_ENABLED = originalValue;
  });

  it("defaults off and removes search from agent discovery", () => {
    delete process.env.PUBLIC_CULTIVAR_SEARCH_ENABLED;

    expect(isPublicCultivarSearchEnabled()).toBe(false);
    expect(getLlmsTxt(baseUrl)).not.toContain("/api/v1/cultivars/search");
    expect(getHomeMarkdown(baseUrl)).not.toContain("/api/v1/cultivars/search");
    expect(getOpenApiDocument(baseUrl).paths).not.toHaveProperty(
      "/api/v1/cultivars/search",
    );
  });

  it("restores search discovery only for an explicit true value", () => {
    process.env.PUBLIC_CULTIVAR_SEARCH_ENABLED = "true";

    expect(isPublicCultivarSearchEnabled()).toBe(true);
    expect(getLlmsTxt(baseUrl)).toContain("/api/v1/cultivars/search");
    expect(getHomeMarkdown(baseUrl)).toContain("/api/v1/cultivars/search");
    expect(getOpenApiDocument(baseUrl).paths).toHaveProperty(
      "/api/v1/cultivars/search",
    );
  });
});
