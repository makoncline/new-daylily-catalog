import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPublicForSaleListingsCount = vi.fn();
const mockGetPublicListingCardsByIds = vi.fn();
const mockGetPublicListingsPageIdsForUserId = vi.fn();
const mockGetPublicSellerContent = vi.fn();
const mockGetPublicSellerListSummaries = vi.fn();
const mockGetPublicSellerSummary = vi.fn();
const mockGetUserIdFromSlugOrId = vi.fn();

vi.mock("@/server/db/public-listing-read-model", () => ({
  getPublicForSaleListingsCount: mockGetPublicForSaleListingsCount,
  getPublicListingCardsByIds: mockGetPublicListingCardsByIds,
  getPublicListingsPageIdsForUserId: mockGetPublicListingsPageIdsForUserId,
}));

vi.mock("@/server/db/public-seller-read-model", () => ({
  getPublicSellerContent: mockGetPublicSellerContent,
  getPublicSellerListSummaries: mockGetPublicSellerListSummaries,
  getPublicSellerSummary: mockGetPublicSellerSummary,
  getUserIdFromSlugOrId: mockGetUserIdFromSlugOrId,
}));

describe("public profile route helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses dedicated public profile page size for paginated profile data", async () => {
    mockGetUserIdFromSlugOrId.mockResolvedValue("user-1");
    mockGetPublicSellerSummary.mockResolvedValue({
      id: "user-1",
      slug: "alpha-garden",
      listingCount: 11,
    });
    mockGetPublicSellerContent.mockResolvedValue({ blocks: [] });
    mockGetPublicSellerListSummaries.mockResolvedValue([]);
    mockGetPublicListingsPageIdsForUserId.mockResolvedValue({
      ids: ["listing-1", "listing-2"],
      page: 1,
      pageSize: 100,
      totalCount: 2,
      totalPages: 1,
    });
    mockGetPublicListingCardsByIds.mockResolvedValue([
      { id: "listing-1" },
      { id: "listing-2" },
    ]);
    mockGetPublicForSaleListingsCount.mockResolvedValue(11);

    const { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } = await import(
      "@/config/constants"
    );
    const { getPublicProfilePageData } = await import(
      "@/app/(public)/[userSlugOrId]/_lib/public-profile-route"
    );

    const pageData = await getPublicProfilePageData("alpha-garden", 1);

    expect(mockGetPublicListingsPageIdsForUserId).toHaveBeenCalledWith({
      userId: "user-1",
      page: 1,
      pageSize: PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
    });
    expect(mockGetPublicListingCardsByIds).toHaveBeenCalledWith([
      "listing-1",
      "listing-2",
    ]);
    expect(mockGetPublicForSaleListingsCount).toHaveBeenCalledWith("user-1");
    expect(pageData.forSaleCount).toBe(11);
  });
});
