// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  cultivarReference: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  v2AhsCultivar: {
    findMany: vi.fn(),
  },
  list: {
    groupBy: vi.fn(),
  },
  listing: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}));

const mockGetProUserIds = vi.hoisted(() => vi.fn());
const mockGetActiveProUserIdsForUserIds = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: mockDb,
  replicaDb: mockDb,
}));

vi.mock("@/server/db/getProUserIds", () => ({
  getActiveProUserIdsForUserIds: (...args: unknown[]) =>
    mockGetActiveProUserIdsForUserIds(...args),
  getProUserIds: (...args: unknown[]) => mockGetProUserIds(...args),
}));

import {
  buildPublicCultivarGardenPhotosFromListingCards,
  buildPublicCultivarOffersFromListingCards,
  getCultivarSitemapEntries,
  getCultivarSitemapEntryCount,
  getPublicCultivarPage,
  getPublicOfferCultivarSitemapEntries,
} from "@/server/db/getPublicCultivars";
import { applyWhereIn } from "./test-utils/apply-where-in";

const originalCloudflareUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_URL;

function createListingUser(userId: string) {
  const profiles: Record<string, { slug: string; title: string }> = {
    "user-alpha": {
      slug: "alpha-pro",
      title: "Alpha Pro Garden",
    },
    "user-hobby": {
      slug: "hobby-garden",
      title: "Hobby Garden",
    },
    "user-top": {
      slug: "top-pro",
      title: "Top Pro Garden",
    },
  };

  return {
    profile: profiles[userId] ?? null,
  };
}

describe("getPublicCultivarPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cf.daylilycatalog.com";
    mockDb.v2AhsCultivar.findMany.mockResolvedValue([]);
    mockGetActiveProUserIdsForUserIds.mockResolvedValue([]);
    mockGetProUserIds.mockResolvedValue([]);
    mockDb.list.groupBy.mockResolvedValue([]);
    mockDb.listing.groupBy.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalCloudflareUrl === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUDFLARE_URL;
    } else {
      process.env.NEXT_PUBLIC_CLOUDFLARE_URL = originalCloudflareUrl;
    }
  });

  it("handles cache-serialized cultivar listing data", () => {
    const listingCards = JSON.parse(
      JSON.stringify([
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
              url: "https://daylily-catalog-images.s3.amazonaws.com/listing/top-a.jpg",
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
              url: "https://media.example/top-c/display-800.webp",
              updatedAt: new Date("2026-01-15T00:00:00.000Z"),
              imageAsset: {
                id: "asset-top-c",
                status: "ready",
                originalUrl: "https://media.example/top-c/original.jpg",
                displayUrl: "https://media.example/top-c/display-800.webp",
                thumbUrl: "https://media.example/top-c/thumb-200.webp",
                blurUrl: "https://media.example/top-c/blur-20.webp",
              },
            },
          ],
          lists: [],
        },
      ]),
    ) as Parameters<
      typeof buildPublicCultivarOffersFromListingCards
    >[0]["listingCards"];

    const summariesByUserId = new Map([
      [
        "user-top",
        {
          id: "user-top",
          slug: "top-pro",
          title: "Top Pro Garden",
          description: "Top catalog",
          location: "Mississippi",
          hasActiveSubscription: true,
          updatedAt: new Date("2026-01-14T00:00:00.000Z").toISOString(),
          createdAt: new Date("2019-01-01T00:00:00.000Z").toISOString(),
          images: [
            {
              id: "profile-top",
              url: "https://example.com/profile-top.jpg",
            },
          ],
          listingCount: 10,
          listCount: 4,
        },
      ],
    ]) as unknown as Parameters<
      typeof buildPublicCultivarOffersFromListingCards
    >[0]["summariesByUserId"];

    const offers = buildPublicCultivarOffersFromListingCards({
      listingCards,
      summariesByUserId,
    });
    const photos = buildPublicCultivarGardenPhotosFromListingCards({
      listingCards,
      summariesByUserId,
    });

    expect(
      offers.offers.gardenCards[0]?.offers.map((offer) => offer.id),
    ).toEqual(["listing-top-a", "listing-top-b"]);
    expect(offers.freshness.offersUpdatedAt).toEqual(
      new Date("2026-01-15T00:00:00.000Z"),
    );
    expect(photos.gardenPhotos[0]).toMatchObject({
      id: "img-top-c",
      listingSlug: "coffee-frenzy-display",
      url: "https://media.example/top-c/display-800.webp",
      imageAsset: {
        blurUrl: "https://media.example/top-c/blur-20.webp",
      },
    });
    expect(photos.freshness.photosUpdatedAt).toEqual(
      new Date("2026-01-15T00:00:00.000Z"),
    );
    expect(offers.offers.gardenCards[0]?.offers[0]?.previewImageUrl).toBe(
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=800,fit=cover,format=auto,quality=90/https://daylily-catalog-images.s3.amazonaws.com/listing/top-a.jpg",
    );
    expect(offers.offers.gardenCards[0]?.offers[1]).toMatchObject({
      id: "listing-top-b",
      previewImageUrl: "https://media.example/top-c/display-800.webp",
      previewImage: {
        imageAsset: {
          displayUrl: "https://media.example/top-c/display-800.webp",
          thumbUrl: "https://media.example/top-c/thumb-200.webp",
        },
      },
    });
  });

  it("returns conversion-ready cultivar payload with pro offers only", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-1",
      normalizedName: "coffee frenzy",
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      v2AhsCultivar: {
        id: "v2-coffee-frenzy",
        post_title: "Coffee Frenzy",
        introduction_date: "2012-01-01",
        primary_hybridizer_name: "Reed",
        hybridizer_code_legacy: null,
        additional_hybridizers_names: null,
        bloom_season_names: "Midseason",
        fragrance_names: "Light",
        bloom_habit_names: "Diurnal",
        foliage_names: "Dormant",
        ploidy_names: "Tet",
        scape_height_in: 36,
        bloom_size_in: 6,
        bud_count: 24,
        branches: 5,
        color: "Coffee brown",
        flower_form_names: "Single",
        unusual_forms_names: null,
        parentage: "(A x B)",
        image_url: "https://example.com/ahs.jpg",
      },
    });

    const listingRows = [
      {
        id: "listing-top-a",
        title: "Coffee Frenzy Prime Fan",
        slug: "coffee-frenzy-prime-fan",
        price: 30,
        description: "Prime",
        updatedAt: new Date("2026-01-11T00:00:00.000Z"),
        userId: "user-top",
        user: createListingUser("user-top"),
        cultivarReferenceId: "cultivar-1",
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
          ...Array.from({ length: 12 }, (_, index) => ({
            id: `img-top-extra-${index}`,
            url: `https://example.com/top-extra-${index}.jpg`,
            updatedAt: new Date("2026-01-09T00:00:00.000Z"),
          })),
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
        user: createListingUser("user-top"),
        cultivarReferenceId: "cultivar-1",
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
        user: createListingUser("user-alpha"),
        cultivarReferenceId: "cultivar-1",
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
        user: createListingUser("user-hobby"),
        cultivarReferenceId: "cultivar-1",
        images: [
          {
            id: "img-hobby-a",
            url: "https://example.com/hobby-a.jpg",
            updatedAt: new Date("2026-01-20T00:00:00.000Z"),
          },
        ],
        lists: [],
      },
    ];

    mockDb.listing.findMany.mockImplementation((args: unknown) => {
      const filteredByUser = applyWhereIn(listingRows, args, "userId");
      return Promise.resolve(applyWhereIn(filteredByUser, args, "id"));
    });

    mockGetProUserIds.mockResolvedValue(["user-alpha", "user-top"]);
    mockGetActiveProUserIdsForUserIds.mockResolvedValue([
      "user-alpha",
      "user-top",
    ]);

    const sellerRows = [
      {
        id: "user-top",
        createdAt: new Date("2019-01-01T00:00:00.000Z"),
        profile: {
          slug: "top-pro",
          title: "Top Pro Garden",
          description: "Top catalog",
          location: "Mississippi",
          updatedAt: new Date("2026-01-14T00:00:00.000Z"),
          images: [
            {
              id: "profile-top",
              url: "https://example.com/profile-top.jpg",
              updatedAt: new Date("2026-01-14T00:00:00.000Z"),
            },
          ],
        },
        _count: { listings: 10, lists: 4 },
        lists: [{ updatedAt: new Date("2026-01-12T00:00:00.000Z") }],
        listings: [{ updatedAt: new Date("2026-01-11T00:00:00.000Z") }],
      },
      {
        id: "user-alpha",
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
        profile: {
          slug: "alpha-pro",
          title: "Alpha Pro Garden",
          description: "Alpha catalog",
          location: "Georgia",
          updatedAt: new Date("2026-01-12T00:00:00.000Z"),
          images: [],
        },
        _count: { listings: 8, lists: 3 },
        lists: [{ updatedAt: new Date("2026-01-10T00:00:00.000Z") }],
        listings: [{ updatedAt: new Date("2026-01-13T00:00:00.000Z") }],
      },
    ];

    mockDb.user.findMany.mockResolvedValue(sellerRows);
    mockDb.v2AhsCultivar.findMany.mockResolvedValue([
      {
        id: "v2-isle-of-wight",
        post_title: "Isle of Wight",
        introduction_date: "2007-01-01",
        primary_hybridizer_name: "Reed",
        hybridizer_code_legacy: null,
        additional_hybridizers_names: null,
        bloom_season_names: "Early",
        fragrance_names: null,
        bloom_habit_names: null,
        foliage_names: null,
        ploidy_names: null,
        scape_height_in: null,
        bloom_size_in: null,
        bud_count: null,
        branches: null,
        color: "Peach",
        flower_form_names: null,
        unusual_forms_names: null,
        parentage: null,
        image_url: "https://example.com/isle.jpg",
        cultivarReference: {
          normalizedName: "isle of wight",
        },
      },
    ]);
    mockDb.listing.groupBy.mockResolvedValue(
      sellerRows.map((seller) => ({
        userId: seller.id,
        _count: { _all: seller._count.listings },
        _max: { updatedAt: seller.listings[0]?.updatedAt ?? null },
      })),
    );
    mockDb.list.groupBy.mockResolvedValue(
      sellerRows.map((seller) => ({
        userId: seller.id,
        _count: { _all: seller._count.lists },
        _max: { updatedAt: seller.lists[0]?.updatedAt ?? null },
      })),
    );

    const result = await getPublicCultivarPage("coffee-frenzy");

    expect(result).not.toBeNull();
    expect(result?.summary.name).toBe("Coffee Frenzy");
    expect(result?.summary.gardensCount).toBe(2);
    expect(result?.summary.offersCount).toBe(3);

    expect(result?.offers.gardenCards.map((garden) => garden.slug)).toEqual([
      "alpha-pro",
      "top-pro",
    ]);

    expect(
      result?.offers.gardenCards
        .find((garden) => garden.slug === "top-pro")
        ?.offers.map((offer) => offer.id),
    ).toEqual(["listing-top-a", "listing-top-b"]);

    expect(result?.heroImages[0]).toMatchObject({
      source: "catalog",
    });
    expect(result?.heroImages).toHaveLength(12);
    expect(result?.heroImages.at(-1)).toMatchObject({
      source: "ahs",
      url: "https://example.com/ahs.jpg",
    });
    expect(result?.heroImages.some((image) => image.id === "img-hobby-a")).toBe(
      false,
    );

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

    expect(result?.gardenPhotos.map((photo) => photo.id)).not.toContain(
      "img-hobby-a",
    );

    expect(mockDb.listing.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          cultivarReferenceId: "cultivar-1",
        }),
        select: {
          id: true,
          userId: true,
        },
        orderBy: [{ title: "asc" }, { id: "asc" }],
      }),
    );
    expect(mockDb.listing.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          id: {
            in: expect.arrayContaining([
              "listing-alpha-a",
              "listing-top-a",
              "listing-top-b",
            ]),
          },
        },
      }),
    );
    expect(mockDb.listing.findMany).toHaveBeenCalledTimes(2);
    expect(mockGetActiveProUserIdsForUserIds).toHaveBeenCalledWith([
      "user-top",
      "user-top",
      "user-alpha",
      "user-hobby",
    ]);

    expect(mockDb.user.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        select: expect.objectContaining({
          profile: expect.objectContaining({
            select: expect.objectContaining({
              images: expect.objectContaining({
                orderBy: {
                  order: "asc",
                },
              }),
            }),
          }),
        }),
      }),
    );

    expect(mockDb.v2AhsCultivar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ primary_hybridizer_name: "Reed" }],
          AND: [
            {
              OR: [
                { image_url: { not: null } },
                {
                  cultivarReference: {
                    is: {
                      imageAssets: {
                        some: {
                          kind: "cultivar",
                          status: "ready",
                        },
                      },
                    },
                  },
                },
              ],
            },
          ],
          cultivarReference: {
            is: expect.objectContaining({
              id: { not: "cultivar-1" },
            }),
          },
        }),
        take: 5,
      }),
    );
    expect(result?.relatedByHybridizer).toEqual([
      expect.objectContaining({
        name: "Isle of Wight",
        segment: "isle-of-wight",
        imageUrl: "https://example.com/isle.jpg",
      }),
    ]);

    expect(result?.freshness.offersUpdatedAt).toEqual(
      new Date("2026-01-15T00:00:00.000Z"),
    );
  });

  it("uses V2 cultivar display data for the public cultivar page", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-v2",
      normalizedName: "coffee frenzy",
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      ahsListing: {
        id: "ahs-1",
        name: "Legacy Coffee Frenzy",
        ahsImageUrl: "https://example.com/legacy.jpg",
        hybridizer: "Legacy Hybridizer",
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
        sculpting: null,
        foliage: null,
        flower: null,
        fragrance: "Light",
        parentage: "(Legacy A x Legacy B)",
        color: "Legacy color",
      },
      v2AhsCultivar: {
        id: "v2-1",
        post_title: "V2 Coffee Frenzy",
        introduction_date: "2024-09-15",
        primary_hybridizer_name: "V2 Hybridizer",
        hybridizer_code_legacy: null,
        additional_hybridizers_names: null,
        bloom_season_names: "Late",
        fragrance_names: null,
        bloom_habit_names: "Extended",
        foliage_names: "Evergreen",
        ploidy_names: "Diploid",
        scape_height_in: 42,
        bloom_size_in: 7.5,
        bud_count: 30,
        branches: 6,
        color: null,
        flower_form_names: "Double",
        unusual_forms_names: "Crispate",
        parentage: "(V2 A x V2 B)",
        image_url: "https://example.com/v2.jpg",
      },
    });

    mockDb.listing.findMany.mockResolvedValue([]);
    mockDb.user.findMany.mockResolvedValue([]);
    const result = await getPublicCultivarPage("coffee-frenzy");

    expect(result?.summary).toMatchObject({
      name: "V2 Coffee Frenzy",
      hybridizer: "V2 Hybridizer",
      year: "2024",
      gardensCount: 0,
      offersCount: 0,
    });
    expect(result?.cultivar.ahsListing).toMatchObject({
      id: "v2-1",
      name: "V2 Coffee Frenzy",
      ahsImageUrl: "https://example.com/v2.jpg",
      scapeHeight: '42"',
      bloomSize: '7.5"',
      bloomSeason: "Late",
      color: null,
      fragrance: null,
      parentage: "(V2 A x V2 B)",
    });
    expect(result?.heroImages[0]).toMatchObject({
      id: "ahs-v2-1",
      url: "https://example.com/v2.jpg",
    });
    expect(mockDb.v2AhsCultivar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ primary_hybridizer_name: "V2 Hybridizer" }],
        }),
      }),
    );
  });

  it("keeps modern hybridizer ids distinct while including legacy-only peers", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-modern-hybridizer",
      normalizedName: "voellig losgeloest",
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      v2AhsCultivar: {
        id: "v2-modern-hybridizer",
        post_title: "Voellig Losgeloest",
        primary_hybridizer_id: "180114",
        primary_hybridizer_name: "Frank Schueler",
        hybridizer_code_legacy: "Schueler",
        image_url: "https://example.com/voellig.jpg",
      },
    });
    mockDb.listing.findMany.mockResolvedValue([]);
    mockDb.user.findMany.mockResolvedValue([]);
    mockDb.v2AhsCultivar.findMany.mockResolvedValue([
      {
        id: "v2-legacy-peer",
        post_title: "Legacy Schueler Peer",
        primary_hybridizer_id: null,
        primary_hybridizer_name: null,
        hybridizer_code_legacy: "Schueler",
        image_url: "https://example.com/legacy-peer.jpg",
        cultivarReference: {
          id: "cultivar-legacy-peer",
          normalizedName: "legacy schueler peer",
        },
      },
    ]);

    const result = await getPublicCultivarPage("voellig-losgeloest");

    expect(result?.relatedByHybridizer).toEqual([
      expect.objectContaining({
        name: "Legacy Schueler Peer",
        segment: "legacy-schueler-peer",
      }),
    ]);
    expect(mockDb.v2AhsCultivar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          cultivarReference: {
            normalizedName: "asc",
          },
        },
        where: expect.objectContaining({
          OR: [
            { primary_hybridizer_id: "180114" },
            {
              primary_hybridizer_id: null,
              primary_hybridizer_name: "Frank Schueler",
            },
            {
              primary_hybridizer_id: null,
              primary_hybridizer_name: null,
              hybridizer_code_legacy: "Schueler",
            },
          ],
        }),
      }),
    );
  });

  it("uses generated cultivar ImageAsset hero images", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-v2",
      normalizedName: "coffee frenzy",
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      ahsListing: {
        id: "ahs-1",
        name: "Legacy Coffee Frenzy",
        ahsImageUrl: "https://example.com/legacy.jpg",
        hybridizer: "Legacy Hybridizer",
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
        sculpting: null,
        foliage: null,
        flower: null,
        fragrance: "Light",
        parentage: "(Legacy A x Legacy B)",
        color: "Legacy color",
      },
      v2AhsCultivar: {
        id: "v2-1",
        post_title: "V2 Coffee Frenzy",
        introduction_date: "2024-09-15",
        primary_hybridizer_name: "V2 Hybridizer",
        hybridizer_code_legacy: null,
        additional_hybridizers_names: null,
        bloom_season_names: "Late",
        fragrance_names: null,
        bloom_habit_names: "Extended",
        foliage_names: "Evergreen",
        ploidy_names: "Diploid",
        scape_height_in: 42,
        bloom_size_in: 7.5,
        bud_count: 30,
        branches: 6,
        color: null,
        flower_form_names: "Double",
        unusual_forms_names: "Crispate",
        parentage: "(V2 A x V2 B)",
        image_url: "https://example.com/v2.jpg",
      },
      imageAssets: [
        {
          id: "asset-coffee",
          legacyImageId: null,
          status: "ready",
          originalUrl: "https://media.daylilycatalog.com/original.png",
          displayUrl: "https://media.daylilycatalog.com/display-800.webp",
          thumbUrl: "https://media.daylilycatalog.com/thumb-200.webp",
          blurUrl: "https://media.daylilycatalog.com/blur-20.webp",
        },
      ],
    });

    mockDb.listing.findMany.mockResolvedValue([]);
    mockDb.user.findMany.mockResolvedValue([]);
    const result = await getPublicCultivarPage("coffee-frenzy");

    expect(result?.heroImages[0]).toMatchObject({
      id: "ahs-v2-1",
      url: "https://media.daylilycatalog.com/display-800.webp",
      imageAsset: {
        id: "asset-coffee",
        blurUrl: "https://media.daylilycatalog.com/blur-20.webp",
      },
    });
  });

  it("includes related cultivars that only have a generated image", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-silver-butterfly",
      normalizedName: "silver butterfly",
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      v2AhsCultivar: {
        id: "v2-silver-butterfly",
        post_title: "Silver Butterfly",
        primary_hybridizer_id: null,
        primary_hybridizer_name: null,
        hybridizer_code_legacy: "Schlumpf",
        image_url: "https://example.com/silver-butterfly.jpg",
      },
      imageAssets: [],
    });
    mockDb.listing.findMany.mockResolvedValue([]);
    mockDb.user.findMany.mockResolvedValue([]);
    mockDb.v2AhsCultivar.findMany.mockResolvedValue([
      {
        id: "v2-black-knight",
        post_title: "Black Knight",
        primary_hybridizer_id: null,
        primary_hybridizer_name: null,
        hybridizer_code_legacy: "Schlumpf",
        image_url: null,
        cultivarReference: {
          id: "cultivar-black-knight",
          normalizedName: "black knight",
          imageAssets: [
            {
              id: "asset-black-knight",
              legacyImageId: null,
              status: "ready",
              originalUrl:
                "https://media.daylilycatalog.com/black-knight/original.png",
              displayUrl:
                "https://media.daylilycatalog.com/black-knight/display-800.webp",
              thumbUrl:
                "https://media.daylilycatalog.com/black-knight/thumb-200.webp",
              blurUrl:
                "https://media.daylilycatalog.com/black-knight/blur-20.webp",
            },
          ],
        },
      },
    ]);

    const result = await getPublicCultivarPage("silver-butterfly");

    expect(result?.relatedByHybridizer).toEqual([
      expect.objectContaining({
        name: "Black Knight",
        segment: "black-knight",
        imageUrl:
          "https://media.daylilycatalog.com/black-knight/display-800.webp",
      }),
    ]);
    expect(mockDb.v2AhsCultivar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { image_url: { not: null } },
                {
                  cultivarReference: {
                    is: {
                      imageAssets: {
                        some: {
                          kind: "cultivar",
                          status: "ready",
                        },
                      },
                    },
                  },
                },
              ],
            },
          ],
        }),
        select: expect.objectContaining({
          cultivarReference: {
            select: expect.objectContaining({
              imageAssets: expect.any(Object),
            }),
          },
        }),
      }),
    );
  });

  it("uses the decoded legacy hybridizer fallback on the public cultivar page when V2 primary is blank", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-v2-fallback",
      normalizedName: "reimer sunrise",
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      ahsListing: {
        id: "ahs-1",
        name: "Legacy Reimer Sunrise",
        ahsImageUrl: "https://example.com/legacy.jpg",
        hybridizer: "Legacy Hybridizer",
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
        sculpting: null,
        foliage: null,
        flower: null,
        fragrance: "Light",
        parentage: "(Legacy A x Legacy B)",
        color: "Legacy color",
      },
      v2AhsCultivar: {
        id: "v2-2",
        post_title: "V2 Reimer Sunrise",
        introduction_date: "2024-09-15",
        primary_hybridizer_name: null,
        hybridizer_code_legacy: "Gregory-CJ &amp; V.",
        additional_hybridizers_names: null,
        bloom_season_names: "Late",
        fragrance_names: null,
        bloom_habit_names: "Extended",
        foliage_names: "Evergreen",
        ploidy_names: "Diploid",
        scape_height_in: 42,
        bloom_size_in: 7.5,
        bud_count: 30,
        branches: 6,
        color: null,
        flower_form_names: "Double",
        unusual_forms_names: "Crispate",
        parentage: "(V2 A x V2 B)",
        image_url: "   ",
      },
    });

    mockDb.listing.findMany.mockResolvedValue([]);
    mockDb.user.findMany.mockResolvedValue([]);
    mockDb.cultivarReference.findMany.mockResolvedValue([]);

    const result = await getPublicCultivarPage("reimer-sunrise");

    expect(result?.summary).toMatchObject({
      name: "V2 Reimer Sunrise",
      hybridizer: "Gregory-CJ & V.",
      year: "2024",
    });
    expect(result?.cultivar.ahsListing).toMatchObject({
      id: "v2-2",
      hybridizer: "Gregory-CJ & V.",
      ahsImageUrl: null,
    });
    expect(result?.heroImages).toEqual([]);
    expect(mockDb.v2AhsCultivar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ hybridizer_code_legacy: "Gregory-CJ &amp; V." }],
        }),
      }),
    );
  });

  it("resolves slugified segments back to punctuation-heavy cultivar names", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-punctuated",
      normalizedName: "a cowgirl's heart",
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      ahsListing: null,
    });

    const listingRows = [
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
    ];
    mockDb.listing.findMany.mockImplementation((args: unknown) =>
      Promise.resolve(applyWhereIn(listingRows, args, "userId")),
    );

    mockGetProUserIds.mockResolvedValue(["user-pro"]);
    mockDb.user.findMany.mockResolvedValue([
      {
        id: "user-pro",
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
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
        lists: [],
        listings: [{ updatedAt: new Date("2026-01-05T00:00:00.000Z") }],
      },
    ]);

    const result = await getPublicCultivarPage("a-cowgirl~27s-heart");

    expect(result?.cultivar.normalizedName).toBe("a cowgirl's heart");
    expect(mockDb.cultivarReference.findFirst).toHaveBeenCalledTimes(1);
    expect(mockDb.cultivarReference.findMany).not.toHaveBeenCalled();
  });

  it("looks up punctuation-bearing canonical route segments without fallbacks", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValueOnce({
      id: "cultivar-curly",
      normalizedName: "aladdin's castle",
      updatedAt: new Date("2026-01-06T00:00:00.000Z"),
      ahsListing: null,
    });

    mockGetProUserIds.mockResolvedValue([]);
    mockDb.listing.findMany.mockResolvedValue([]);
    mockDb.user.findMany.mockResolvedValue([]);

    const result = await getPublicCultivarPage("aladdin~27s-castle");
    const findFirstArgs = mockDb.cultivarReference.findFirst.mock.calls[0]?.[0];

    expect(result?.cultivar.normalizedName).toBe("aladdin's castle");
    expect(mockDb.cultivarReference.findFirst).toHaveBeenCalledTimes(1);
    expect(mockDb.cultivarReference.findMany).not.toHaveBeenCalled();
    expect(findFirstArgs).toMatchObject({
      where: {
        AND: expect.arrayContaining([
          {
            normalizedName: "aladdin's castle",
          },
        ]),
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  });

  it("rejects non-canonical cultivar route segments before hitting the database", async () => {
    const result = await getPublicCultivarPage("coffee frenzy");

    expect(result).toBeNull();
    expect(mockDb.cultivarReference.findFirst).not.toHaveBeenCalled();
    expect(mockDb.listing.findMany).not.toHaveBeenCalled();
  });

  it("allows direct cultivar page lookup without requiring linked listings", async () => {
    mockDb.cultivarReference.findFirst.mockResolvedValue({
      id: "cultivar-orphan",
      normalizedName: "orphan cultivar",
      updatedAt: new Date("2026-01-05T00:00:00.000Z"),
      ahsListing: null,
    });

    mockGetProUserIds.mockResolvedValue([]);
    mockDb.listing.findMany.mockResolvedValue([]);
    mockDb.user.findMany.mockResolvedValue([]);

    const result = await getPublicCultivarPage("orphan-cultivar");
    const findFirstArgs = mockDb.cultivarReference.findFirst.mock.calls[0]?.[0];

    expect(result).not.toBeNull();
    expect(result?.offers.summary.offersCount).toBe(0);
    expect(result?.offers.summary.gardensCount).toBe(0);
    expect(findFirstArgs?.where).toMatchObject({
      AND: expect.arrayContaining([
        {
          normalizedName: {
            not: null,
          },
        },
      ]),
    });
    expect(JSON.stringify(findFirstArgs?.where)).not.toContain("listings");
    expect(mockDb.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cultivarReferenceId: "cultivar-orphan",
        }),
      }),
    );
  });
});

describe("getCultivarSitemapEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pages through every routable cultivar on the replica without requiring a public listing", async () => {
    mockDb.cultivarReference.count.mockResolvedValue(104_000);
    const cultivarRows = [
      {
        normalizedName: "50,000 watts",
      },
      {
        normalizedName: "aerial appliqué",
      },
      {
        normalizedName: "coffee frenzy",
      },
    ];
    mockDb.cultivarReference.findMany.mockResolvedValue(cultivarRows);

    const [count, result] = await Promise.all([
      getCultivarSitemapEntryCount(),
      getCultivarSitemapEntries({
        page: 2,
        pageSize: 45_000,
      }),
    ]);

    expect(count).toBe(104_000);
    expect(mockDb.cultivarReference.count).toHaveBeenCalledWith({
      where: { normalizedName: { not: null } },
    });

    expect(result).toEqual([
      {
        segment: "50~2c000-watts",
      },
      {
        segment: "aerial-applique",
      },
      {
        segment: "coffee-frenzy",
      },
    ]);

    expect(mockDb.cultivarReference.findMany).toHaveBeenCalledWith({
      where: { normalizedName: { not: null } },
      select: { normalizedName: true },
      orderBy: { normalizedName: "asc" },
      skip: 90_000,
      take: 45_000,
    });
    expect(mockDb.listing.findMany).not.toHaveBeenCalled();
    expect(mockGetProUserIds).not.toHaveBeenCalled();
  });
});

describe("getPublicOfferCultivarSitemapEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns routable cultivars offered by active pro sellers", async () => {
    mockGetProUserIds.mockResolvedValue(["user-pro"]);
    mockDb.cultivarReference.findMany.mockResolvedValue([
      { normalizedName: "jumpin' jan" },
      { normalizedName: "coffee frenzy" },
    ]);

    await expect(getPublicOfferCultivarSitemapEntries()).resolves.toEqual([
      { segment: "jumpin~27-jan" },
      { segment: "coffee-frenzy" },
    ]);

    expect(mockDb.cultivarReference.findMany).toHaveBeenCalledWith({
      where: {
        normalizedName: { not: null },
        listings: {
          some: {
            OR: [{ status: null }, { NOT: { status: "HIDDEN" } }],
            userId: { in: ["user-pro"] },
          },
        },
      },
      select: { normalizedName: true },
      orderBy: { normalizedName: "asc" },
    });
  });
});
