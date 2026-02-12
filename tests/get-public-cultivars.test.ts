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

  it("returns conversion-ready cultivar payload and excludes non-pro offers", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-1",
      normalizedName: "coffee frenzy",
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      ahsListing: {
        id: "ahs-1",
        name: "Coffee Frenzy",
        ahsImageUrl: "https://example.com/ahs.jpg",
        hybridizer: "Reed",
        year: "2012",
        scapeHeight: "36 inches",
        bloomSize: "6 inches",
        bloomSeason: "Midseason",
        form: "Single",
        ploidy: "Tet",
        foliageType: "Dormant",
        bloomHabit: "Diurnal",
        budcount: "24",
        branches: "5",
        sculpting: "Ruffled",
        foliage: "Green",
        flower: "Cocoa brown with gold throat",
        fragrance: "Light",
        parentage: "(A x B)",
        color: "Coffee brown",
      },
    });

    mockDb.listing.findMany.mockResolvedValue([
      {
        id: "listing-top-a",
        title: "Coffee Frenzy Prime Fan",
        slug: "coffee-frenzy-prime-fan",
        price: 30,
        description: "Prime",
        updatedAt: new Date("2026-01-11T00:00:00.000Z"),
        userId: "user-top",
        images: [
          {
            id: "img-top-a",
            url: "https://example.com/top-a.jpg",
            updatedAt: new Date("2026-01-11T00:00:00.000Z"),
          },
          {
            id: "img-top-b",
            url: "https://example.com/top-b.jpg",
            updatedAt: new Date("2026-01-10T00:00:00.000Z"),
          },
        ],
        lists: [{ id: "list-show", title: "Show Winners" }],
      },
      {
        id: "listing-top-b",
        title: "Coffee Frenzy Display",
        slug: "coffee-frenzy-display",
        price: null,
        description: "Display",
        updatedAt: new Date("2026-01-15T00:00:00.000Z"),
        userId: "user-top",
        images: [
          {
            id: "img-top-c",
            url: "https://example.com/top-c.jpg",
            updatedAt: new Date("2026-01-15T00:00:00.000Z"),
          },
        ],
        lists: [],
      },
      {
        id: "listing-alpha-a",
        title: "Alpha Coffee Frenzy",
        slug: "alpha-coffee-frenzy",
        price: 24,
        description: "Alpha",
        updatedAt: new Date("2026-01-13T00:00:00.000Z"),
        userId: "user-alpha",
        images: [
          {
            id: "img-alpha-a",
            url: "https://example.com/alpha-a.jpg",
            updatedAt: new Date("2026-01-13T00:00:00.000Z"),
          },
        ],
        lists: [],
      },
      {
        id: "listing-hobby-a",
        title: "Hobby Coffee Frenzy",
        slug: "hobby-coffee-frenzy",
        price: 10,
        description: "Hobby",
        updatedAt: new Date("2026-01-20T00:00:00.000Z"),
        userId: "user-hobby",
        images: [
          {
            id: "img-hobby-a",
            url: "https://example.com/hobby-a.jpg",
            updatedAt: new Date("2026-01-20T00:00:00.000Z"),
          },
        ],
        lists: [],
      },
    ]);

    mockDb.user.findMany.mockResolvedValue([
      {
        id: "user-top",
        createdAt: new Date("2019-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-top",
        profile: {
          slug: "top-pro",
          title: "Top Pro Garden",
          description: "Top catalog",
          location: "Mississippi",
          updatedAt: new Date("2026-01-14T00:00:00.000Z"),
          images: [{ id: "profile-top", url: "https://example.com/profile-top.jpg" }],
        },
        _count: { listings: 10, lists: 4 },
      },
      {
        id: "user-alpha",
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-alpha",
        profile: {
          slug: "alpha-pro",
          title: "Alpha Pro Garden",
          description: "Alpha catalog",
          location: "Georgia",
          updatedAt: new Date("2026-01-12T00:00:00.000Z"),
          images: [],
        },
        _count: { listings: 8, lists: 3 },
      },
      {
        id: "user-hobby",
        createdAt: new Date("2021-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-hobby",
        profile: {
          slug: "hobby-grower",
          title: "Hobby Grower",
          description: null,
          location: null,
          updatedAt: new Date("2026-01-21T00:00:00.000Z"),
          images: [],
        },
        _count: { listings: 2, lists: 1 },
      },
    ]);

    mockGetStripeSubscription.mockImplementation(
      async (stripeCustomerId: string) => {
        if (stripeCustomerId === "cus-hobby") {
          return { status: "none" };
        }

        return { status: "active" };
      },
    );

    mockDb.cultivarReference.findMany.mockResolvedValue([
      {
        normalizedName: "isle of wight",
        ahsListing: {
          id: "ahs-isle",
          name: "Isle of Wight",
          ahsImageUrl: "https://example.com/isle.jpg",
          hybridizer: "Reed",
          year: "2007",
          bloomSeason: "Early",
          color: "Peach",
        },
        listings: [],
      },
      {
        normalizedName: "goldenzelle",
        ahsListing: {
          id: "ahs-golden",
          name: "Goldenzelle",
          ahsImageUrl: null,
          hybridizer: "Reed",
          year: "2002",
          bloomSeason: "Mid",
          color: "Apricot",
        },
        listings: [
          {
            images: [{ url: "https://example.com/goldenzelle.jpg" }],
          },
        ],
      },
      {
        normalizedName: "no image cultivar",
        ahsListing: {
          id: "ahs-none",
          name: "No Image",
          ahsImageUrl: null,
          hybridizer: "Reed",
          year: "2015",
          bloomSeason: null,
          color: null,
        },
        listings: [],
      },
    ]);

    const result = await getPublicCultivarPage("coffee-frenzy");

    expect(result).not.toBeNull();
    expect(result?.summary.name).toBe("Coffee Frenzy");
    expect(result?.summary.gardensCount).toBe(2);
    expect(result?.summary.offersCount).toBe(3);

    expect(result?.offers.gardenCards.map((garden) => garden.slug)).toEqual([
      "alpha-pro",
      "top-pro",
    ]);

    expect(result?.offers.gardenCards[1]?.offers.map((offer) => offer.id)).toEqual([
      "listing-top-a",
      "listing-top-b",
    ]);

    expect(result?.heroImages[0]).toMatchObject({
      source: "ahs",
      url: "https://example.com/ahs.jpg",
    });
    expect(result?.heroImages.some((image) => image.id === "img-hobby-a")).toBe(false);

    expect(result?.quickSpecs.top.map((spec) => spec.label)).toEqual(
      expect.arrayContaining([
        "Scape Height",
        "Bloom Size",
        "Ploidy",
        "Bud Count",
        "Branches",
        "Parentage",
        "Color",
      ]),
    );

    expect(result?.gardenPhotos.map((photo) => photo.id)).not.toContain("img-hobby-a");

    expect(result?.relatedByHybridizer.map((cultivar) => cultivar.segment)).toEqual([
      "isle-of-wight",
      "goldenzelle",
    ]);

    expect(result?.freshness.offersUpdatedAt).toEqual(
      new Date("2026-01-15T00:00:00.000Z"),
    );
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
