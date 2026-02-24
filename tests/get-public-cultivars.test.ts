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

    expect(mockDb.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: {
            in: expect.arrayContaining(["user-top", "user-alpha"]),
          },
        }),
      }),
    );

    expect(result?.relatedByHybridizer.map((cultivar) => cultivar.segment)).toEqual([
      "isle-of-wight",
      "goldenzelle",
    ]);

    expect(result?.freshness.offersUpdatedAt).toEqual(
      new Date("2026-01-15T00:00:00.000Z"),
    );
  });

  it("resolves slugified segments back to punctuation-heavy cultivar names", async () => {
    mockDb.cultivarReference.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "cultivar-punctuated",
        normalizedName: "a cowgirl's heart",
        updatedAt: new Date("2026-01-05T00:00:00.000Z"),
        ahsListing: null,
      });

    mockDb.cultivarReference.findMany.mockResolvedValue([
      {
        normalizedName: "a cowgirl's heart",
      },
    ]);

    mockDb.listing.findMany.mockResolvedValue([
      {
        id: "listing-punctuated",
        title: "A Cowgirl's Heart",
        slug: "a-cowgirls-heart",
        price: null,
        description: null,
        updatedAt: new Date("2026-01-05T00:00:00.000Z"),
        userId: "user-pro",
        images: [],
        lists: [],
      },
    ]);

    mockDb.user.findMany.mockResolvedValue([
      {
        id: "user-pro",
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-pro",
        profile: {
          slug: "pro-garden",
          title: "Pro Garden",
          description: null,
          location: null,
          updatedAt: new Date("2026-01-05T00:00:00.000Z"),
          images: [],
        },
        _count: {
          listings: 1,
          lists: 1,
        },
      },
    ]);

    mockGetStripeSubscription.mockResolvedValue({ status: "active" });

    const result = await getPublicCultivarPage("a-cowgirls-heart");

    expect(result?.cultivar.normalizedName).toBe("a cowgirl's heart");
    expect(mockDb.cultivarReference.findFirst).toHaveBeenCalledTimes(2);
  });

  it("treats subscription lookup failures as non-pro instead of failing cultivar response", async () => {
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
        scapeHeight: null,
        bloomSize: null,
        bloomSeason: null,
        form: null,
        ploidy: null,
        foliageType: null,
        bloomHabit: null,
        budcount: null,
        branches: null,
        sculpting: null,
        foliage: null,
        flower: null,
        fragrance: null,
        parentage: null,
        color: null,
      },
    });

    mockDb.listing.findMany.mockResolvedValue([
      {
        id: "listing-ok",
        title: "Coffee Frenzy Pro",
        slug: "coffee-frenzy-pro",
        price: 20,
        description: "Available",
        updatedAt: new Date("2026-01-10T00:00:00.000Z"),
        userId: "user-ok",
        images: [],
        lists: [],
      },
      {
        id: "listing-failing-sub",
        title: "Coffee Frenzy Failing Sub",
        slug: "coffee-frenzy-failing-sub",
        price: 18,
        description: "Available",
        updatedAt: new Date("2026-01-10T00:00:00.000Z"),
        userId: "user-failing-sub",
        images: [],
        lists: [],
      },
    ]);

    mockDb.user.findMany.mockResolvedValue([
      {
        id: "user-ok",
        createdAt: new Date("2019-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-ok",
        profile: {
          slug: "ok-pro",
          title: "OK Pro Garden",
          description: null,
          location: null,
          updatedAt: new Date("2026-01-10T00:00:00.000Z"),
          images: [],
        },
        _count: { listings: 4, lists: 1 },
      },
      {
        id: "user-failing-sub",
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
        stripeCustomerId: "cus-failing-sub",
        profile: {
          slug: "failing-pro",
          title: "Failing Pro Garden",
          description: null,
          location: null,
          updatedAt: new Date("2026-01-10T00:00:00.000Z"),
          images: [],
        },
        _count: { listings: 4, lists: 1 },
      },
    ]);

    mockGetStripeSubscription.mockImplementation(
      async (stripeCustomerId: string) => {
        if (stripeCustomerId === "cus-failing-sub") {
          throw new Error("kv unavailable");
        }

        return { status: "active" };
      },
    );

    mockDb.cultivarReference.findMany.mockResolvedValue([]);

    const result = await getPublicCultivarPage("coffee-frenzy");

    expect(result).not.toBeNull();
    expect(result?.offers.gardenCards.map((garden) => garden.slug)).toEqual(["ok-pro"]);
  });
});

describe("getCultivarSitemapEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses cultivar/listing updated times and keeps canonical slug ordering stable", async () => {
    mockDb.user.findMany.mockResolvedValue([
      {
        id: "user-pro",
        stripeCustomerId: "cus-pro",
      },
      {
        id: "user-free",
        stripeCustomerId: "cus-free",
      },
    ]);

    mockGetStripeSubscription.mockImplementation(
      async (stripeCustomerId: string) =>
        stripeCustomerId === "cus-pro"
          ? { status: "active" }
          : { status: "none" },
    );

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
      {
        normalizedName: "aerial appliqué",
        updatedAt: new Date("2026-01-06T00:00:00.000Z"),
        listings: [],
      },
      {
        normalizedName: "50,000 watts",
        updatedAt: new Date("2026-01-07T00:00:00.000Z"),
        listings: [],
      },
    ]);

    const result = await getCultivarSitemapEntries();

    expect(result).toEqual([
      {
        segment: "50000-watts",
        lastModified: new Date("2026-01-07T00:00:00.000Z"),
      },
      {
        segment: "aerial-applique",
        lastModified: new Date("2026-01-06T00:00:00.000Z"),
      },
      {
        segment: "apple-blossom",
        lastModified: new Date("2026-01-05T00:00:00.000Z"),
      },
      {
        segment: "coffee-frenzy",
        lastModified: new Date("2026-01-03T00:00:00.000Z"),
      },
    ]);

    expect(mockDb.cultivarReference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          listings: {
            some: expect.objectContaining({
              userId: {
                in: ["user-pro"],
              },
            }),
          },
        }),
        select: expect.objectContaining({
          listings: expect.objectContaining({
            where: expect.objectContaining({
              userId: {
                in: ["user-pro"],
              },
            }),
          }),
        }),
      }),
    );
  });
});
