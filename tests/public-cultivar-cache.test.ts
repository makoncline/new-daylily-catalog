// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPublicCultivarSummaryTag,
  getPublicCultivarTag,
} from "@/lib/cache/public-cache-tags";

const createKeyedServerCacheMock = vi.hoisted(() => vi.fn(() => vi.fn()));
const createServerCacheMock = vi.hoisted(() => vi.fn(() => vi.fn()));

vi.mock("@/lib/cache/server-cache", () => ({
  createKeyedServerCache: createKeyedServerCacheMock,
  createServerCache: createServerCacheMock,
}));

vi.mock("@/server/db/getCachedProUserIds", () => ({
  getCachedProUserIds: vi.fn(),
}));

vi.mock("@/server/db/public-cultivar-read-model", () => ({
  buildPublicCultivarPageFromListingCards: vi.fn(),
  getCultivarRouteSegments: vi.fn(),
  getCultivarSitemapEntries: vi.fn(),
  getPublicCultivarListingIds: vi.fn(),
  getPublicCultivarSummary: vi.fn(),
}));

vi.mock("@/server/db/public-listing-read-model", () => ({
  getInitialListings: vi.fn(),
  getListings: vi.fn(),
  getPublicListingDetail: vi.fn(),
}));

vi.mock("@/server/db/public-profile-cache", () => ({
  getCachedPublicCatalogRouteEntries: vi.fn(),
  getCachedPublicForSaleListingsCount: vi.fn(),
  getCachedPublicListingCardsByIds: vi.fn(),
  getCachedPublicListingsPage: vi.fn(),
  getCachedPublicListingsPageIds: vi.fn(),
  getCachedPublicProfile: vi.fn(),
  getCachedPublicSellerContent: vi.fn(),
  getCachedPublicSellerLists: vi.fn(),
  getCachedPublicSellerSummary: vi.fn(),
  getCachedPublicUserIdFromSlugOrId: vi.fn(),
}));

vi.mock("@/server/db/public-seller-read-model", () => ({
  getPublicCatalogCardsByUserIds: vi.fn(),
  getPublicSellerSummariesByUserIds: vi.fn(),
}));

interface KeyedCacheOptions {
  getKeyParts: (segment: string) => string[];
  getTags?: (segment: string) => string[] | undefined;
}

function getKeyedCacheOptions(cachePrefix: string): KeyedCacheOptions {
  const matchingCall = createKeyedServerCacheMock.mock.calls.find((call) => {
    const [, options] = call as unknown as [unknown, KeyedCacheOptions];
    return options.getKeyParts("segment")[0] === cachePrefix;
  });

  if (!matchingCall) {
    throw new Error(`Missing keyed cache options for ${cachePrefix}`);
  }

  const [, options] = matchingCall as unknown as [unknown, KeyedCacheOptions];
  return options;
}

describe("public cultivar cache keying", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createKeyedServerCacheMock.mockImplementation(() => vi.fn());
    createServerCacheMock.mockImplementation(() => vi.fn());
  });

  it("keys cultivar caches by the exact requested segment", async () => {
    await import("@/server/db/public-cache");

    const summaryCache = getKeyedCacheOptions("public:cultivar-summary");
    const listingIdsCache = getKeyedCacheOptions("public:cultivar-listing-ids");

    expect(summaryCache.getKeyParts("COFFEE-FRENZY ")).toEqual([
      "public:cultivar-summary",
      "COFFEE-FRENZY ",
    ]);
    expect(summaryCache.getTags?.("COFFEE-FRENZY ")).toEqual([
      getPublicCultivarTag("COFFEE-FRENZY "),
      getPublicCultivarSummaryTag("COFFEE-FRENZY "),
    ]);

    expect(listingIdsCache.getKeyParts("COFFEE-FRENZY ")).toEqual([
      "public:cultivar-listing-ids",
      "COFFEE-FRENZY ",
    ]);
    expect(listingIdsCache.getTags?.("COFFEE-FRENZY ")).toEqual([
      getPublicCultivarTag("COFFEE-FRENZY "),
    ]);
  });
});
