import { describe, expect, it } from "vitest";
import {
  buildPublicProfilePageModel,
  toProfileSectionModel,
} from "@/app/(public)/[userSlugOrId]/_lib/public-profile-model";
import { type PublicProfilePageData } from "@/app/(public)/[userSlugOrId]/_lib/public-profile-route";

describe("public profile page model", () => {
  it("builds derived urls and section props from route data", async () => {
    const data: PublicProfilePageData = {
      profile: {
        id: "user-1",
        slug: "seeded-daylily",
        title: "Seeded Daylily Garden",
        description: "Beautiful daylily catalog",
        content: null,
        location: "Snohomish, WA",
        images: [],
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-02T00:00:00.000Z"),
        _count: {
          listings: 234,
        },
        lists: [
          {
            id: "general",
            title: "General Listing",
            description: "Main catalog list",
            listingCount: 120,
          },
        ],
        hasActiveSubscription: true,
      },
      items: [],
      page: 3,
      pageSize: 100,
      totalCount: 234,
      totalPages: 5,
      forSaleCount: 17,
    };

    const model = await buildPublicProfilePageModel(data);

    expect(model.canonicalUserSlug).toBe("seeded-daylily");
    expect(model.listings.listingsSection.searchHref).toBe(
      "/seeded-daylily/search?page=3",
    );
    expect(model.listings.listsSection.forSaleHref).toBe(
      "/seeded-daylily/search?price=true",
    );
    expect(model.listings.listsSection.lists[0]?.href).toBe(
      "/seeded-daylily/search?lists=general",
    );
    expect(model.listings.listsSection.lists[0]?.listingCountLabel).toBe(
      "120 listings",
    );
    expect(model.listings.listsSection.forSaleCountLabel).toBe("17 listings");
    expect(model.listings.listingsSection.totalCountLabel).toBe("234 total");
    expect(model.searchPrefetch).toEqual({
      userId: "user-1",
      userSlugOrId: "seeded-daylily",
    });
  });

  it("maps profile section model with simplified list shape", () => {
    const section = toProfileSectionModel({
      id: "user-2",
      slug: "garden-two",
      title: "Garden Two",
      description: null,
      content: null,
      location: null,
      images: [],
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      _count: {
        listings: 7,
      },
      lists: [
        {
          id: "l-1",
          title: "Seedlings",
          description: "internal description not needed",
          listingCount: 3,
        },
      ],
      hasActiveSubscription: false,
    });

    expect(section).toEqual({
      id: "user-2",
      title: "Garden Two",
      description: null,
      location: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      hasActiveSubscription: false,
      _count: {
        listings: 7,
      },
      lists: [
        {
          id: "l-1",
          title: "Seedlings",
          listingCount: 3,
        },
      ],
    });
  });
});
