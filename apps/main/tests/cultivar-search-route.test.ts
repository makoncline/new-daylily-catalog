// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const searchCultivarsMock = vi.hoisted(() => vi.fn());
const publicSearchApiState = vi.hoisted(() => ({ enabled: true }));
const reportErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/search/cultivar-search", () => ({
  searchCultivars: searchCultivarsMock,
}));

vi.mock("@/lib/agent-readiness", () => ({
  getTrustedBaseUrl: () => "https://daylilycatalog.com",
}));

vi.mock("@/lib/utils/getBaseUrl", () => ({
  getCanonicalBaseUrl: () => "https://daylilycatalog.com",
}));

vi.mock("@/lib/error-utils", () => ({
  reportError: reportErrorMock,
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
    reportErrorMock.mockReset();
    publicSearchApiState.enabled = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    const infoMock = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
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
        "https://daylilycatalog.com/api/v1/cultivars/search?mode=summary&q=Stell&limit=24&offset=24&award=HM&flowerShow=Large&sculptedType=Cristate%7CRelief&hybridizer=Reed%7CStone&hasCultivarPhoto=true&photosFirst=true&sort=name",
        { headers: { "cf-ray": "cultivar-search-request" } },
      ),
    );

    expect(searchCultivarsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        award: "HM",
        baseUrl: "https://daylilycatalog.com",
        flowerShow: "Large",
        hasCultivarPhoto: true,
        hybridizer: "Reed|Stone",
        includeParentageTrees: false,
        limit: 25,
        listingLimit: 0,
        offset: 24,
        photosFirst: true,
        prefixLastToken: true,
        q: "Stell",
        sculptedType: "Cristate|Relief",
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
    expect(response.headers.get("X-Cultivar-Search-Request-Id")).toBeNull();
    expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBe(
      "public, max-age=43200, stale-while-revalidate=604800, stale-if-error=86400",
    );
    expect(response.headers.get("X-Cultivar-Search-Duration-Ms")).toBeNull();

    const rawLog = infoMock.mock.calls.at(-1)?.[0];
    expect(JSON.parse(String(rawLog))).toMatchObject({
      active_filters:
        "award|flower_show|has_cultivar_photo|hybridizer|sculpted_type",
      component: "public-cultivar-search",
      event: "public_cultivar_search_request",
      filter_count: 5,
      flower_show: "large",
      has_cultivar_photo: true,
      hybridizer: "reed|stone",
      has_more: true,
      http_status: 200,
      mode: "summary",
      offset: 24,
      page_number: 2,
      photos_first: true,
      query: "stell",
      query_kind: "query_and_filters",
      request_id: "cultivar-search-request",
      results_returned: 24,
      sculpted_type: "cristate|relief",
      sort: "name",
      award: "hm",
      source_surface: "public_page",
      status: "success",
    });
  });

  it("logs the effective full API listing filters and photo boost", async () => {
    const infoMock = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    searchCultivarsMock.mockResolvedValue([]);

    const { GET } = await import("@/app/api/v1/cultivars/search/route");
    await GET(
      new Request(
        "https://daylilycatalog.com/api/v1/cultivars/search?listingTitle=Summer+Sale&listingDescription=fresh+division&hasPhoto=true&priceMin=10&priceMax=30&photosFirst=0",
      ),
    );

    expect(searchCultivarsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasPhoto: true,
        listingDescription: "fresh division",
        listingTitle: "Summer Sale",
        photosFirst: false,
        priceMax: 30,
        priceMin: 10,
      }),
    );
    const filteredApiLog = JSON.parse(
      String(infoMock.mock.calls.at(-1)?.[0]),
    ) as Record<string, unknown>;
    expect(filteredApiLog).toMatchObject({
      active_filters:
        "has_listing_photo|listing_description|listing_title|price_max|price_min",
      filter_count: 5,
      has_listing_photo: true,
      listing_description: "fresh division",
      listing_title: "summer sale",
      photos_first: false,
      price_max: 30,
      price_min: 10,
      query_kind: "filters_only",
      source_surface: "public_api",
    });
    expect(filteredApiLog).not.toHaveProperty("has_more");

    await GET(
      new Request("https://daylilycatalog.com/api/v1/cultivars/search"),
    );
    expect(
      JSON.parse(String(infoMock.mock.calls.at(-1)?.[0])),
    ).not.toHaveProperty("photos_first");
  });

  it("returns correlated telemetry headers for unexpected failures", async () => {
    const errorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const failure = new Error("Search database failed");
    searchCultivarsMock.mockRejectedValue(failure);

    const { GET } = await import("@/app/api/v1/cultivars/search/route");
    const response = await GET(
      new Request("https://daylilycatalog.com/api/v1/cultivars/search", {
        headers: { "x-request-id": "failed-search-request" },
      }),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBeNull();
    expect(response.headers.get("X-Cultivar-Search-Request-Id")).toBe(
      "failed-search-request",
    );
    expect(
      Number(response.headers.get("X-Cultivar-Search-Duration-Ms")),
    ).toEqual(expect.any(Number));
    await expect(response.json()).resolves.toEqual({
      error: "internal_server_error",
      message: "Cultivar search could not be loaded.",
    });
    expect(reportErrorMock).toHaveBeenCalledWith({
      error: failure,
      context: {
        requestId: "failed-search-request",
        source: "public-cultivar-search",
      },
    });
    expect(JSON.parse(String(errorMock.mock.calls.at(-1)?.[0]))).toMatchObject({
      error_name: "Error",
      http_status: 500,
      request_id: "failed-search-request",
      status: "error",
    });
  });
});
