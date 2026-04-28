import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCachedPublicCatalogRouteEntries = vi.fn();
const mockGetCachedPublicForSaleListingsCount = vi.fn();
const mockGetCachedPublicListingCardsByIds = vi.fn();
const mockGetCachedPublicListingsPageIds = vi.fn();
const mockGetCachedPublicSellerContent = vi.fn();
const mockGetCachedPublicSellerLists = vi.fn();
const mockGetCachedPublicSellerSummary = vi.fn();
const mockGetCachedPublicUserIdFromSlugOrId = vi.fn();

vi.mock("@/server/db/public-profile-cache", () => ({
  getCachedPublicCatalogRouteEntries: mockGetCachedPublicCatalogRouteEntries,
  getCachedPublicForSaleListingsCount: mockGetCachedPublicForSaleListingsCount,
  getCachedPublicListingCardsByIds: mockGetCachedPublicListingCardsByIds,
  getCachedPublicListingsPageIds: mockGetCachedPublicListingsPageIds,
  getCachedPublicProfile: vi.fn(),
  getCachedPublicSellerContent: mockGetCachedPublicSellerContent,
  getCachedPublicSellerLists: mockGetCachedPublicSellerLists,
  getCachedPublicSellerSummary: mockGetCachedPublicSellerSummary,
  getCachedPublicUserIdFromSlugOrId: mockGetCachedPublicUserIdFromSlugOrId,
}));

describe("public profile route helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates static params for base and paginated routes", async () => {
    mockGetCachedPublicCatalogRouteEntries.mockResolvedValue([
      {
        slug: "alpha-garden",
        totalPages: 3,
        lastModified: new Date("2026-02-17T00:00:00.000Z"),
      },
      {
        slug: "beta-garden",
        totalPages: 1,
        lastModified: new Date("2026-02-17T00:00:00.000Z"),
      },
    ]);

    const {
      getPublicProfilePaginatedStaticParams,
      getPublicProfileStaticParams,
    } = await import("@/app/(public)/[userSlugOrId]/_lib/public-profile-route");

    const baseParams = await getPublicProfileStaticParams();
    expect(baseParams).toEqual([
      { userSlugOrId: "alpha-garden" },
      { userSlugOrId: "beta-garden" },
    ]);

    const paginatedParams = await getPublicProfilePaginatedStaticParams();
    expect(paginatedParams).toEqual([
      { userSlugOrId: "alpha-garden", page: "2" },
      { userSlugOrId: "alpha-garden", page: "3" },
    ]);
  });

  it("uses dedicated public profile page size for paginated profile data", async () => {
    mockGetCachedPublicUserIdFromSlugOrId.mockResolvedValue("user-1");
    mockGetCachedPublicSellerSummary.mockResolvedValue({
      id: "user-1",
      slug: "alpha-garden",
      listingCount: 11,
    });
    mockGetCachedPublicSellerContent.mockResolvedValue({ blocks: [] });
    mockGetCachedPublicSellerLists.mockResolvedValue([]);
    mockGetCachedPublicListingsPageIds.mockResolvedValue({
      ids: ["listing-1", "listing-2"],
      page: 1,
      pageSize: 100,
      totalCount: 2,
      totalPages: 1,
    });
    mockGetCachedPublicListingCardsByIds.mockResolvedValue([
      { id: "listing-1" },
      { id: "listing-2" },
    ]);
    mockGetCachedPublicForSaleListingsCount.mockResolvedValue(11);

    const { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } = await import(
      "@/config/constants"
    );
    const { getPublicProfilePageData } = await import(
      "@/app/(public)/[userSlugOrId]/_lib/public-profile-route"
    );

    const pageData = await getPublicProfilePageData("alpha-garden", 1);

    expect(mockGetCachedPublicListingsPageIds).toHaveBeenCalledWith({
      userSlugOrId: "alpha-garden",
      page: 1,
      pageSize: PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
    });
    expect(mockGetCachedPublicListingCardsByIds).toHaveBeenCalledWith([
      "listing-1",
      "listing-2",
    ]);
    expect(mockGetCachedPublicForSaleListingsCount).toHaveBeenCalledWith(
      "user-1",
    );
    expect(pageData.forSaleCount).toBe(11);
  });
});
