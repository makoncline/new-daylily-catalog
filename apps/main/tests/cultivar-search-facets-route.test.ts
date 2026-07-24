// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const searchCultivarFacetValuesMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/search/cultivar-search", () => ({
  searchCultivarFacetValues: searchCultivarFacetValuesMock,
}));

vi.mock("@/server/search/public-search-api-platform", () => ({
  getPublicSearchApiDisabledResponse: () =>
    Response.json({ ok: false }, { status: 404 }),
  isPublicSearchApiEnabled: () => true,
  toPublicSearchStatus: vi.fn(),
}));

vi.mock("@/server/search/public-search-index", () => ({
  PublicSearchIndexUnavailableError: class PublicSearchIndexUnavailableError extends Error {},
}));

describe("public cultivar search facets route", () => {
  beforeEach(() => {
    searchCultivarFacetValuesMock.mockReset();
  });

  it("returns searchable hybridizer options", async () => {
    searchCultivarFacetValuesMock.mockResolvedValue([
      { count: 42, label: "Reed", value: "Reed" },
    ]);
    const { GET } = await import("@/app/api/v1/cultivars/facets/route");

    const response = await GET(
      new Request(
        "https://daylilycatalog.com/api/v1/cultivars/facets?facet=hybridizer&q=Re",
      ),
    );

    expect(searchCultivarFacetValuesMock).toHaveBeenCalledWith({
      facet: "hybridizer",
      query: "Re",
    });
    expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBe(
      "public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400",
    );
    await expect(response.json()).resolves.toEqual({
      options: [{ count: 42, label: "Reed", value: "Reed" }],
    });
  });
});
