import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPublicCatalogRouteEntries = vi.fn();
const mockGetPublicListingsPage = vi.fn();
const mockGetPublicForSaleListingsCount = vi.fn();
const mockGetPublicProfile = vi.fn();

vi.mock("@/server/db/getPublicListings", () => ({
  getPublicCatalogRouteEntries: mockGetPublicCatalogRouteEntries,
  getPublicListingsPage: mockGetPublicListingsPage,
  getPublicForSaleListingsCount: mockGetPublicForSaleListingsCount,
}));

vi.mock("@/server/db/getPublicProfile", () => ({
  getPublicProfile: mockGetPublicProfile,
}));

describe("public profile route helpers", () => {
  beforeEach(() => {
    mockGetPublicCatalogRouteEntries.mockReset();
    mockGetPublicListingsPage.mockReset();
    mockGetPublicForSaleListingsCount.mockReset();
    mockGetPublicProfile.mockReset();
  });

  it("generates static params for base and paginated routes", async () => {
    mockGetPublicCatalogRouteEntries.mockResolvedValue([
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
    mockGetPublicProfile.mockResolvedValue({
      id: "user-1",
      slug: "alpha-garden",
    });
    mockGetPublicListingsPage.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      totalCount: 0,
      totalPages: 1,
    });
    mockGetPublicForSaleListingsCount.mockResolvedValue(11);

    const { PUBLIC_PROFILE_LISTINGS_PAGE_SIZE } = await import(
      "@/config/constants"
    );
    const { getPublicProfilePageData } = await import(
      "@/app/(public)/[userSlugOrId]/_lib/public-profile-route"
    );

    const pageData = await getPublicProfilePageData("alpha-garden", 1);

    expect(mockGetPublicListingsPage).toHaveBeenCalledWith({
      userSlugOrId: "alpha-garden",
      page: 1,
      pageSize: PUBLIC_PROFILE_LISTINGS_PAGE_SIZE,
    });
    expect(mockGetPublicForSaleListingsCount).toHaveBeenCalledWith("user-1");
    expect(pageData).toMatchObject({
      profile: { id: "user-1", slug: "alpha-garden" },
      items: [],
      page: 1,
      pageSize: 100,
      totalCount: 0,
      totalPages: 1,
      forSaleCount: 11,
    });
  });
});
