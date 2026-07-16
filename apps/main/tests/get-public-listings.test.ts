// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  keyValue: {
    findMany: vi.fn(),
  },
  listing: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}));

const mockGetUserIdFromSlugOrId = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: mockDb,
  replicaDb: mockDb,
}));

vi.mock("@/server/db/getPublicProfile", () => ({
  getUserIdFromSlugOrId: (...args: unknown[]) =>
    mockGetUserIdFromSlugOrId(...args),
}));

import {
  getListings,
  getPublicCatalogRouteEntries,
  getPublicListingDetail,
  getPublicListingRouteEntries,
  getPublicListingsPage,
  transformListings,
} from "@/server/db/getPublicListings";
import { applyWhereIn } from "./test-utils/apply-where-in";

const originalCloudflareUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_URL;
const originalUseGeneratedCultivarImageAssets =
  process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS;

function getQueryText(query: unknown): string {
  if (
    query &&
    typeof query === "object" &&
    "strings" in query &&
    Array.isArray((query as { strings: unknown }).strings)
  ) {
    return ((query as { strings: string[] }).strings ?? []).join(" ");
  }

  return String(query);
}

function createListing(id: string, title: string) {
  return {
    id,
    title,
    slug: `${title.toLowerCase().replace(/\s+/g, "-")}-${id}`,
    description: null,
    price: null,
    userId: "user-1",
    user: {
      profile: {
        slug: "grower",
        title: "Grower",
      },
    },
    lists: [],
    cultivarReference: {
      normalizedName: null,
      ahsListing: null,
    },
    images: [],
    imageAssets: [],
  };
}

interface UserFindManyArgs {
  where?: {
    id?: {
      in?: string[];
    };
    stripeCustomerId?: {
      not?: null;
    };
  };
}

describe("getPublicListings helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CLOUDFLARE_URL = "https://cf.daylilycatalog.com";
  });

  afterEach(() => {
    if (originalCloudflareUrl === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUDFLARE_URL;
    } else {
      process.env.NEXT_PUBLIC_CLOUDFLARE_URL = originalCloudflareUrl;
    }

    if (originalUseGeneratedCultivarImageAssets === undefined) {
      delete process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS;
    } else {
      process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS =
        originalUseGeneratedCultivarImageAssets;
    }
  });

  it("uses the same deterministic sorted ids for cursor pagination", async () => {
    mockDb.$queryRaw.mockResolvedValue([
      { id: "id-a" },
      { id: "id-b" },
      { id: "id-c" },
      { id: "id-d" },
    ]);

    mockDb.listing.findMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] } } }) => {
        const rows = where.id.in
          .map((id) => {
            switch (id) {
              case "id-a":
                return createListing("id-a", "Alpha");
              case "id-b":
                return createListing("id-b", "Bravo");
              case "id-c":
                return createListing("id-c", "Charlie");
              case "id-d":
                return createListing("id-d", "Delta");
              default:
                return createListing(id, id);
            }
          })
          .reverse();

        return Promise.resolve(rows);
      },
    );

    const rows = await getListings({
      userId: "user-1",
      limit: 2,
      cursor: "id-a",
    });

    expect(rows.map((row) => row.id)).toEqual(["id-b", "id-c", "id-d"]);
  });

  it("returns SEO page slices from the same sorted-id source", async () => {
    mockGetUserIdFromSlugOrId.mockResolvedValue("user-1");
    mockDb.listing.count.mockResolvedValue(4);
    mockDb.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "id-c" }, { id: "id-d" }]);

    mockDb.listing.findMany.mockImplementation(
      ({ where }: { where: { id: { in: string[] } } }) => {
        const rows = where.id.in
          .map((id) => {
            switch (id) {
              case "id-a":
                return createListing("id-a", "Alpha");
              case "id-b":
                return createListing("id-b", "Bravo");
              case "id-c":
                return createListing("id-c", "Charlie");
              case "id-d":
                return createListing("id-d", "Delta");
              default:
                return createListing(id, id);
            }
          })
          .reverse();

        return Promise.resolve(rows);
      },
    );

    const page = await getPublicListingsPage({
      userSlugOrId: "grower",
      page: 99,
      pageSize: 2,
    });

    expect(page.page).toBe(2);
    expect(page.totalPages).toBe(2);
    expect(page.totalCount).toBe(4);
    expect(page.items.map((row) => row.id)).toEqual(["id-c", "id-d"]);
  });

  it("uses for-sale-first sorting for SEO page ids only", async () => {
    mockGetUserIdFromSlugOrId.mockResolvedValue("user-1");
    mockDb.listing.count.mockResolvedValue(0);
    mockDb.$queryRaw.mockResolvedValue([]);

    await getPublicListingsPage({
      userSlugOrId: "grower",
      page: 1,
      pageSize: 2,
    });

    const seoQuery = getQueryText(mockDb.$queryRaw.mock.calls[0]?.[0]);
    expect(seoQuery).toMatch(/COALESCE\("price", 0\) > 0/);
    expect(seoQuery).toMatch(/LIMIT\s+OFFSET/);

    mockDb.$queryRaw.mockClear();
    mockDb.$queryRaw.mockResolvedValue([]);

    await getListings({
      userId: "user-1",
      limit: 2,
    });

    const searchQuery = getQueryText(mockDb.$queryRaw.mock.calls[0]?.[0]);
    expect(searchQuery).not.toMatch(/COALESCE\("price", 0\) > 0/);
  });

  it("maps V2 cultivar display data onto public listing cards", () => {
    const transformed = transformListings([
      {
        ...createListing("id-a", "Alpha"),
        updatedAt: new Date("2026-04-08T00:00:00.000Z"),
        cultivarReference: {
          id: "cultivar-alpha",
          normalizedName: "alpha",
          v2AhsCultivar: {
            id: "v2-1",
            post_title: "V2 Alpha",
            introduction_date: "2024-05-01",
            primary_hybridizer_name: null,
            hybridizer_code_legacy: "Thibault-Lipp&eacute;",
            additional_hybridizers_names: null,
            bloom_season_names: "Late",
            fragrance_names: "Heavy",
            bloom_habit_names: "Extended",
            foliage_names: "Evergreen",
            ploidy_names: "Diploid",
            scape_height_in: 36,
            bloom_size_in: 7.5,
            bud_count: 28,
            branches: 5,
            color: null,
            flower_form_names: "Double",
            unusual_forms_names: "Crispate",
            sculpted_type_names: null,
            parentage: "(V2 A x V2 B)",
            image_url: "https://example.com/v2-alpha.jpg",
          },
          imageAssets: [],
        },
        images: [],
      },
    ] as Parameters<typeof transformListings>[0]);

    expect(transformed[0]?.ahsListing).toMatchObject({
      id: "v2-1",
      name: "V2 Alpha",
      ahsImageUrl: "https://example.com/v2-alpha.jpg",
      hybridizer: "Thibault-Lippé",
      year: "2024",
      bloomSeason: "Late",
      bloomSize: '7.5"',
      color: null,
    });
    expect(transformed[0]?.cultivarReference?.ahsListing).toMatchObject({
      name: "V2 Alpha",
      ahsImageUrl: "https://example.com/v2-alpha.jpg",
    });
    expect(transformed[0]?.images).toEqual([
      {
        id: "ahs-id-a",
        url: "https://example.com/v2-alpha.jpg",
        updatedAt: new Date("2026-04-08T00:00:00.000Z"),
      },
    ]);
  });

  it("uses generated cultivar ImageAsset fallback images when enabled", () => {
    process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS = "true";

    const transformed = transformListings([
      {
        ...createListing("id-a", "Alpha"),
        updatedAt: new Date("2026-04-08T00:00:00.000Z"),
        cultivarReference: {
          id: "cultivar-alpha",
          normalizedName: "alpha",
          v2AhsCultivar: {
            id: "v2-1",
            post_title: "V2 Alpha",
            introduction_date: "2024-05-01",
            primary_hybridizer_name: "V2 Hybridizer",
            hybridizer_code_legacy: null,
            additional_hybridizers_names: null,
            bloom_season_names: "Late",
            fragrance_names: null,
            bloom_habit_names: null,
            foliage_names: null,
            ploidy_names: null,
            scape_height_in: null,
            bloom_size_in: null,
            bud_count: null,
            branches: null,
            color: null,
            flower_form_names: null,
            unusual_forms_names: null,
            sculpted_type_names: null,
            parentage: null,
            image_url: "https://example.com/v2-alpha.jpg",
          },
          imageAssets: [
            {
              id: "asset-alpha",
              legacyImageId: null,
              order: 0,
              kind: "cultivar",
              status: "ready",
              originalKey: "cultivar-images/alpha/original.png",
              originalUrl: "https://media.daylilycatalog.com/original.png",
              displayKey: "cultivar-images/alpha/display-800.webp",
              displayUrl: "https://media.daylilycatalog.com/display-800.webp",
              thumbKey: "cultivar-images/alpha/thumb-200.webp",
              thumbUrl: "https://media.daylilycatalog.com/thumb-200.webp",
              blurKey: "cultivar-images/alpha/blur-20.webp",
              blurUrl: "https://media.daylilycatalog.com/blur-20.webp",
              createdAt: new Date("2026-04-08T00:00:00.000Z"),
              updatedAt: new Date("2026-04-08T00:00:00.000Z"),
              userProfileId: null,
              listingId: null,
              cultivarReferenceId: "cultivar-alpha",
            },
          ],
        },
        images: [],
      },
    ] as Parameters<typeof transformListings>[0]);

    expect(transformed[0]?.images[0]).toMatchObject({
      id: "ahs-id-a",
      url: "https://media.daylilycatalog.com/display-800.webp",
      imageAsset: {
        id: "asset-alpha",
        blurUrl: "https://media.daylilycatalog.com/blur-20.webp",
      },
    });
  });

  it("excludes free accounts from public catalog route entries", async () => {
    const listingCounts = [
      { userId: "user-pro", _count: { _all: 210 } },
      { userId: "user-free", _count: { _all: 95 } },
    ];

    const users = [
      {
        id: "user-pro",
        stripeCustomerId: "cus-pro",
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
        profile: {
          slug: "pro-garden",
          updatedAt: new Date("2026-02-01T00:00:00.000Z"),
        },
      },
      {
        id: "user-free",
        stripeCustomerId: "cus-free",
        createdAt: new Date("2021-01-01T00:00:00.000Z"),
        profile: {
          slug: "free-garden",
          updatedAt: new Date("2026-02-01T00:00:00.000Z"),
        },
      },
    ];

    mockDb.listing.groupBy.mockImplementation((args: unknown) =>
      Promise.resolve(applyWhereIn(listingCounts, args, "userId")),
    );

    mockDb.user.findMany.mockImplementation((args: unknown) => {
      const filteredById = applyWhereIn(users, args, "id");
      const requiresStripeCustomerId =
        (args as UserFindManyArgs | undefined)?.where?.stripeCustomerId?.not ===
        null;

      if (!requiresStripeCustomerId) {
        return Promise.resolve(filteredById);
      }

      return Promise.resolve(
        filteredById.filter((user) => user.stripeCustomerId !== null),
      );
    });

    mockDb.keyValue.findMany.mockResolvedValue([
      {
        key: "stripe:customer:cus-pro",
        value: JSON.stringify({ status: "active" }),
      },
      {
        key: "stripe:customer:cus-free",
        value: JSON.stringify({ status: "none" }),
      },
    ]);

    const entries = await getPublicCatalogRouteEntries();

    expect(entries).toEqual([
      {
        slug: "pro-garden",
        totalPages: 5,
        lastModified: new Date("2026-02-01T00:00:00.000Z"),
      },
    ]);
    expect(mockDb.keyValue.findMany).toHaveBeenCalledTimes(1);
  });

  it("returns dedicated public listing detail from a published listing", async () => {
    mockDb.listing.findFirst.mockResolvedValue({
      ...createListing("id-a", "Every Friday Night"),
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
      price: 30,
      images: [
        {
          id: "image-a",
          url: "https://daylily-catalog-images.s3.amazonaws.com/listings/every-friday-night.jpg",
          updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        },
      ],
      user: {
        profile: {
          slug: "rolling-oaks",
          title: "Rolling Oaks Daylilies",
        },
      },
    });
    mockDb.keyValue.findMany.mockResolvedValue([
      {
        key: "stripe:customer:cus-pro",
        value: JSON.stringify({ status: "active" }),
      },
    ]);
    mockDb.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        stripeCustomerId: "cus-pro",
      },
    ]);

    const listing = await getPublicListingDetail("id-a");

    expect(mockDb.listing.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "id-a",
        }),
      }),
    );
    expect(listing).toMatchObject({
      id: "id-a",
      title: "Every Friday Night",
      userSlug: "rolling-oaks",
      sellerTitle: "Rolling Oaks Daylilies",
      hasActiveSubscription: true,
    });
    expect(listing.images[0]?.url).toBe(
      "https://cf.daylilycatalog.com/cdn-cgi/image/width=800,fit=cover,format=auto,quality=90/https://daylily-catalog-images.s3.amazonaws.com/listings/every-friday-night.jpg",
    );
  });

  it("uses ImageAsset display URLs for public listing detail", async () => {
    mockDb.listing.findFirst.mockResolvedValue({
      ...createListing("id-a", "Every Friday Night"),
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
      price: 30,
      images: [
        {
          id: "image-a",
          url: "https://daylily-catalog-images.s3.amazonaws.com/listings/every-friday-night.jpg",
          updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        },
      ],
      imageAssets: [
        {
          id: "image-a",
          legacyImageId: "image-a",
          status: "ready",
          originalUrl:
            "https://media.daylilycatalog.com/users/user-1/listing-images/id-a/image-a/original.jpg",
          displayUrl:
            "https://media.daylilycatalog.com/users/user-1/listing-images/id-a/image-a/display-800.webp",
          thumbUrl:
            "https://media.daylilycatalog.com/users/user-1/listing-images/id-a/image-a/thumb-200.webp",
          blurUrl:
            "https://media.daylilycatalog.com/users/user-1/listing-images/id-a/image-a/blur-20.webp",
        },
      ],
      user: {
        profile: {
          slug: "rolling-oaks",
          title: "Rolling Oaks Daylilies",
        },
      },
    });
    mockDb.keyValue.findMany.mockResolvedValue([
      {
        key: "stripe:customer:cus-pro",
        value: JSON.stringify({ status: "active" }),
      },
    ]);
    mockDb.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        stripeCustomerId: "cus-pro",
      },
    ]);

    const listing = await getPublicListingDetail("id-a");

    expect(listing.images[0]?.url).toBe(
      "https://media.daylilycatalog.com/users/user-1/listing-images/id-a/image-a/display-800.webp",
    );
    expect(listing.images[0]?.imageAsset?.blurUrl).toBe(
      "https://media.daylilycatalog.com/users/user-1/listing-images/id-a/image-a/blur-20.webp",
    );
  });

  it("returns only pro-user public listing route entries for the sitemap", async () => {
    mockDb.keyValue.findMany.mockResolvedValue([
      {
        key: "stripe:customer:cus-pro",
        value: JSON.stringify({ status: "active" }),
      },
      {
        key: "stripe:customer:cus-free",
        value: JSON.stringify({ status: "none" }),
      },
    ]);
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
    mockDb.listing.findMany.mockResolvedValue([
      {
        id: "id-a",
        slug: "every-friday-night",
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        user: {
          id: "user-pro",
          profile: {
            slug: "rolling-oaks",
          },
        },
      },
    ]);

    const entries = await getPublicListingRouteEntries();

    expect(mockDb.listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ["user-pro"] },
        }),
      }),
    );
    expect(entries).toEqual([
      {
        sellerSlug: "rolling-oaks",
        listingSlug: "every-friday-night",
        lastModified: new Date("2026-05-01T00:00:00.000Z"),
      },
    ]);
  });
});
