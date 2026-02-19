import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPublicCatalogRouteEntries = vi.fn();

vi.mock("@/server/db/getPublicListings", () => ({
  getPublicCatalogRouteEntries: mockGetPublicCatalogRouteEntries,
  getPublicListingsPage: vi.fn(),
}));

vi.mock("@/server/db/getPublicProfile", () => ({
  getPublicProfile: vi.fn(),
}));

describe("public profile route helpers", () => {
  beforeEach(() => {
    mockGetPublicCatalogRouteEntries.mockReset();
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
});
