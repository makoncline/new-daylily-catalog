// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  cultivarReference: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  listing: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}));

const mockGetStripeSubscription = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: mockDb,
}));

vi.mock("@/server/stripe/sync-subscription", () => ({
  getStripeSubscription: (...args: unknown[]) =>
    mockGetStripeSubscription(...args),
}));

import {
  getCultivarSitemapEntries,
  getPublicCultivarPage,
} from "@/server/db/getPublicCultivars";

describe("getPublicCultivarPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groups by catalog, filters to pro users, and applies catalog/listing ordering", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-1",
      normalizedName: "coffee frenzy",
      ahsListing: {
        id: "ahs-1",
        name: "Coffee Frenzy",
        ahsImageUrl: "https://example.com/ahs.jpg",
      },
    });

    mockDb.listing.findMany.mockResolvedValue([
      {
        id: "listing-top-sale-older",
        title: "Top Sale Older",
        slug: "top-sale-older",
        price: 15,
        description: null,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        userId: "user-top",
        images: [{ id: "img-1", url: "https://example.com/top-older.jpg" }],
        lists: [{ id: "list-1", title: "Top List" }],
      },
      {
        id: "listing-top-not-sale",
        title: "Top Not For Sale",
        slug: "top-not-sale",
        price: null,
        description: null,
        updatedAt: new Date("2026-01-03T00:00:00.000Z"),
        userId: "user-top",
        images: [
          { id: "img-2", url: "https://example.com/top-not-sale-a.jpg" },
          { id: "img-3", url: "https://example.com/top-not-sale-b.jpg" },
          { id: "img-4", url: "https://example.com/top-not-sale-c.jpg" },
          { id: "img-5", url: "https://example.com/top-not-sale-d.jpg" },
          { id: "img-6", url: "https://example.com/top-not-sale-e.jpg" },
        ],
        lists: [],
      },
      {
        id: "listing-top-sale-newer",
        title: "Top Sale Newer",
        slug: "top-sale-newer",
        price: 25,
        description: null,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        userId: "user-top",
        images: [{ id: "img-7", url: "https://example.com/top-newer.jpg" }],
        lists: [],
      },
      {
        id: "listing-alpha-sale",
        title: "Alpha Sale",
        slug: "alpha-sale",
        price: 30,
        description: null,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        userId: "user-alpha",
        images: [
          { id: "img-8", url: "https://example.com/alpha-a.jpg" },
          { id: "img-9", url: "https://example.com/alpha-b.jpg" },
        ],
        lists: [],
      },
      {
        id: "listing-alpha-not-sale",
        title: "Alpha Not Sale",
        slug: "alpha-not-sale",
        price: null,
        description: null,
        updatedAt: new Date("2026-01-04T00:00:00.000Z"),
        userId: "user-alpha",
        images: [
          { id: "img-10", url: "https://example.com/alpha-c.jpg" },
          { id: "img-11", url: "https://example.com/alpha-d.jpg" },
        ],
        lists: [],
      },
      {
        id: "listing-beta-sale",
        title: "Beta Sale",
        slug: "beta-sale",
        price: 20,
        description: null,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        userId: "user-beta",
        images: [
          { id: "img-12", url: "https://example.com/beta-a.jpg" },
          { id: "img-13", url: "https://example.com/beta-b.jpg" },
          { id: "img-14", url: "https://example.com/beta-c.jpg" },
          { id: "img-15", url: "https://example.com/beta-d.jpg" },
        ],
        lists: [],
      },
      {
        id: "listing-non-pro",
        title: "Non Pro Listing",
        slug: "non-pro-listing",
        price: 99,
        description: null,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        userId: "user-non-pro",
        images: Array.from({ length: 12 }, (_, index) => ({
          id: `img-non-pro-${index}`,
          url: `https://example.com/non-pro-${index}.jpg`,
        })),
        lists: [],
      },
    ]);

    mockDb.user.findMany.mockResolvedValue([
      {
        id: "user-top",
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-top",
        profile: {
          slug: "top-pro",
          title: "Top Pro Garden",
          description: "Top pro description",
          location: "Picayune Mississippi",
          updatedAt: new Date("2026-02-11T00:00:00.000Z"),
          images: [{ id: "profile-1", url: "https://example.com/profile-1.jpg" }],
        },
        _count: { listings: 2, lists: 7 },
      },
      {
        id: "user-alpha",
        createdAt: new Date("2021-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-alpha",
        profile: {
          slug: "alpha-pro",
          title: "Alpha Garden",
          description: "Alpha description",
          location: "Alabama",
          updatedAt: new Date("2026-02-10T00:00:00.000Z"),
          images: [],
        },
        _count: { listings: 8, lists: 5 },
      },
      {
        id: "user-beta",
        createdAt: new Date("2022-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-beta",
        profile: {
          slug: "beta-pro",
          title: "Beta Garden",
          description: "Beta description",
          location: "Georgia",
          updatedAt: new Date("2026-02-09T00:00:00.000Z"),
          images: [],
        },
        _count: { listings: 8, lists: 4 },
      },
      {
        id: "user-non-pro",
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-non-pro",
        profile: {
          slug: "non-pro",
          title: "Non Pro Garden",
          description: null,
          location: null,
          updatedAt: new Date("2026-02-01T00:00:00.000Z"),
          images: [],
        },
        _count: { listings: 99, lists: 1 },
      },
    ]);

    mockGetStripeSubscription.mockImplementation(
      async (stripeCustomerId: string) => {
        if (stripeCustomerId === "cus-non-pro") {
          return { status: "none" };
        }

        return { status: "active" };
      },
    );

    const result = await getPublicCultivarPage("coffee-frenzy");

    expect(result).not.toBeNull();
    expect(result?.cultivar.ahsListing?.ahsImageUrl).toBe(
      "https://example.com/ahs.jpg",
    );

    expect(result?.catalogs.map((catalog) => catalog.slug)).toEqual([
      "top-pro",
      "alpha-pro",
      "beta-pro",
    ]);

    expect(
      result?.catalogs.every((catalog) => catalog.hasActiveSubscription),
    ).toBe(true);

    expect(result?.catalogs[0]?.cultivarUploadedImageCount).toBe(7);
    expect(result?.catalogs[1]?.cultivarUploadedImageCount).toBe(4);
    expect(result?.catalogs[2]?.cultivarUploadedImageCount).toBe(4);

    expect(result?.catalogs[0]?.cultivarListings.map((listing) => listing.id)).toEqual([
      "listing-top-sale-newer",
      "listing-top-sale-older",
      "listing-top-not-sale",
    ]);

    expect(result?.catalogs[0]?.cultivarListings[0]?.previewImageUrl).toBe(
      "https://example.com/top-newer.jpg",
    );
    expect(result?.catalogs[0]?.cultivarListings[2]?.previewImageUrl).toBe(
      "https://example.com/top-not-sale-a.jpg",
    );

    expect(
      result?.catalogs.flatMap((catalog) =>
        catalog.cultivarListings.map((listing) => listing.id),
      ),
    ).not.toContain("listing-non-pro");
  });
});

describe("getCultivarSitemapEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses cultivar/listing updated times and keeps canonical slug ordering stable", async () => {
    mockDb.cultivarReference.findMany.mockResolvedValue([
      {
        normalizedName: "coffee frenzy",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        listings: [{ updatedAt: new Date("2026-01-03T00:00:00.000Z") }],
      },
      {
        normalizedName: "coffee-frenzy",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        listings: [],
      },
      {
        normalizedName: "apple blossom",
        updatedAt: new Date("2026-01-05T00:00:00.000Z"),
        listings: [{ updatedAt: new Date("2026-01-04T00:00:00.000Z") }],
      },
    ]);

    const result = await getCultivarSitemapEntries();

    expect(result).toEqual([
      {
        segment: "apple-blossom",
        lastModified: new Date("2026-01-05T00:00:00.000Z"),
      },
      {
        segment: "coffee-frenzy",
        lastModified: new Date("2026-01-03T00:00:00.000Z"),
      },
    ]);
  });
});
