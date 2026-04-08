// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  listing: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}));

const mockGetUserIdFromSlugOrId = vi.hoisted(() => vi.fn());
const mockGetStripeSubscription = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: mockDb,
}));

vi.mock("@/server/db/getPublicProfile", () => ({
  getUserIdFromSlugOrId: (...args: unknown[]) =>
    mockGetUserIdFromSlugOrId(...args),
}));

vi.mock("@/server/stripe/sync-subscription", () => ({
  getStripeSubscription: (...args: unknown[]) =>
    mockGetStripeSubscription(...args),
}));

import {
  getListings,
  getPublicCatalogRouteEntries,
  getPublicListingsPage,
  transformListings,
} from "@/server/db/getPublicListings";
import { applyWhereIn } from "./test-utils/apply-where-in";

const originalV2DisplayFlag =
  process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA;

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
  });

  afterEach(() => {
    if (originalV2DisplayFlag === undefined) {
      delete process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA;
      return;
    }

    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = originalV2DisplayFlag;
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
    mockDb.$queryRaw.mockResolvedValue([]);

    await getPublicListingsPage({
      userSlugOrId: "grower",
      page: 1,
      pageSize: 2,
    });

    const seoQuery = getQueryText(mockDb.$queryRaw.mock.calls[0]?.[0]);
    expect(seoQuery).toMatch(/COALESCE\("price", 0\) > 0/);

    mockDb.$queryRaw.mockClear();
    mockDb.$queryRaw.mockResolvedValue([]);

    await getListings({
      userId: "user-1",
      limit: 2,
    });

    const searchQuery = getQueryText(mockDb.$queryRaw.mock.calls[0]?.[0]);
    expect(searchQuery).not.toMatch(/COALESCE\("price", 0\) > 0/);
  });

  it("maps V2 cultivar display data onto public listing cards when the feature flag is enabled", () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "true";

    const transformed = transformListings([
      {
        ...createListing("id-a", "Alpha"),
        updatedAt: new Date("2026-04-08T00:00:00.000Z"),
        cultivarReference: {
          normalizedName: "alpha",
          ahsListing: {
            id: "ahs-1",
            name: "Legacy Alpha",
            ahsImageUrl: "https://example.com/legacy-alpha.jpg",
            hybridizer: "Legacy Hybridizer",
            year: "2011",
            scapeHeight: "30 inches",
            bloomSize: "6 inches",
            bloomSeason: "Midseason",
            form: "Single",
            ploidy: "Tetraploid",
            foliageType: "Dormant",
            bloomHabit: "Diurnal",
            budcount: "20",
            branches: "4",
            sculpting: null,
            foliage: null,
            flower: null,
            fragrance: null,
            parentage: "(Legacy A x Legacy B)",
            color: "Legacy color",
          },
          v2AhsCultivar: {
            id: "v2-1",
            post_title: "V2 Alpha",
            introduction_date: "2024-05-01",
            primary_hybridizer_name: "V2 Hybridizer",
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
            parentage: "(V2 A x V2 B)",
            image_url: "https://example.com/v2-alpha.jpg",
          },
        },
        images: [],
      },
    ] as Parameters<typeof transformListings>[0]);

    expect(transformed[0]?.ahsListing).toMatchObject({
      id: "v2-1",
      name: "V2 Alpha",
      ahsImageUrl: "https://example.com/v2-alpha.jpg",
      hybridizer: "V2 Hybridizer",
      year: "2024",
      bloomSeason: "Late",
      bloomSize: "7.5 inches",
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

    mockGetStripeSubscription.mockImplementation(
      async (stripeCustomerId: string) =>
        stripeCustomerId === "cus-pro"
          ? { status: "active" }
          : { status: "none" },
    );

    const entries = await getPublicCatalogRouteEntries();

    expect(entries).toEqual([
      {
        slug: "pro-garden",
        totalPages: 5,
        lastModified: new Date("2026-02-01T00:00:00.000Z"),
      },
    ]);
  });
});
