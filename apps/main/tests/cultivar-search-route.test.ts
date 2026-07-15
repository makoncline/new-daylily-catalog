// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const searchCultivarsMock = vi.hoisted(() => vi.fn());
const publicSearchApiState = vi.hoisted(() => ({ enabled: true }));

vi.mock("@/server/search/cultivar-search", () => ({
  searchCultivars: searchCultivarsMock,
}));

vi.mock("@/lib/agent-readiness", () => ({
  getRequestBaseUrl: () => "https://daylilycatalog.com",
}));

vi.mock("@/lib/utils/getBaseUrl", () => ({
  getCanonicalBaseUrl: () => "https://daylilycatalog.com",
}));

vi.mock("@/server/search/public-search-api-platform", () => ({
  getPublicSearchApiDisabledResponse: () =>
    Response.json({ ok: false }, { status: 404 }),
  isPublicSearchApiEnabled: () => publicSearchApiState.enabled,
  toPublicSearchStatus: vi.fn(),
}));

vi.mock("@/server/search/public-search-index", () => ({
  PublicSearchIndexUnavailableError: class PublicSearchIndexUnavailableError extends Error {},
}));

describe("public cultivar search route", () => {
  beforeEach(() => {
    searchCultivarsMock.mockReset();
    publicSearchApiState.enabled = true;
  });

  it("returns 404 without touching the index when the feature is disabled", async () => {
    publicSearchApiState.enabled = false;
    const { GET } = await import("@/app/api/v1/cultivars/search/route");

    const response = await GET(
      new Request("https://daylilycatalog.com/api/v1/cultivars/search?q=Stell"),
    );

    expect(response.status).toBe(404);
    expect(searchCultivarsMock).not.toHaveBeenCalled();
  });

  it("uses the compact prefix-search path and returns bounded pagination", async () => {
    searchCultivarsMock.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => ({
        canonicalUrl: `https://daylilycatalog.com/cultivar/result-${index}`,
        cultivarReferenceId: `cultivar-${index}`,
        name: `Result ${index}`,
      })),
    );

    const { GET } = await import("@/app/api/v1/cultivars/search/route");
    const response = await GET(
      new Request(
        "https://daylilycatalog.com/api/v1/cultivars/search?mode=summary&q=Stell&limit=24&offset=24&hasCultivarPhoto=true&sort=name",
      ),
    );

    expect(searchCultivarsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCultivarPhoto: true,
        includeParentageTrees: false,
        limit: 25,
        listingLimit: 0,
        offset: 24,
        prefixLastToken: true,
        q: "Stell",
        sort: "name",
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      pagination: {
        hasMore: true,
        limit: 24,
        nextOffset: 48,
      },
      results: expect.arrayContaining([
        expect.objectContaining({ cultivarReferenceId: "cultivar-0" }),
      ]),
    });
  });
});
