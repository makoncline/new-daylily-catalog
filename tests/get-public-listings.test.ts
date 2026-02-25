// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

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
} from "@/server/db/getPublicListings";

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

function applyWhereIn<T extends Record<string, unknown>>(
  rows: T[],
  args: unknown,
  field: keyof T & string,
) {
  const allowed = (args as {
    where?: Partial<Record<keyof T & string, { in?: unknown[] }>>;
  })?.where?.[field]?.in;

  if (!Array.isArray(allowed)) {
    return rows;
  }

  return rows.filter((row) => allowed.includes(row[field]));
}

describe("getPublicListings helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
