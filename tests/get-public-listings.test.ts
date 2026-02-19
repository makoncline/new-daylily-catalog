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

vi.mock("@/server/db", () => ({
  db: mockDb,
}));

vi.mock("@/server/db/getPublicProfile", () => ({
  getUserIdFromSlugOrId: (...args: unknown[]) =>
    mockGetUserIdFromSlugOrId(...args),
}));

import {
  getListings,
  getPublicListingsPage,
} from "@/server/db/getPublicListings";

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
});
