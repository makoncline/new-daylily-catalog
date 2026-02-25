// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
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

import { getPublicProfiles } from "@/server/db/getPublicProfiles";

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

function applyIdWhereFilter<T extends { id: string }>(rows: T[], args: unknown) {
  const allowedIds = (args as UserFindManyArgs | undefined)?.where?.id?.in;

  if (!Array.isArray(allowedIds)) {
    return rows;
  }

  return rows.filter((row) => allowedIds.includes(row.id));
}

describe("getPublicProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only pro catalogs for the /catalogs page", async () => {
    const users = [
      {
        id: "user-pro",
        stripeCustomerId: "cus-pro",
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
        profile: {
          title: "Pro Garden",
          slug: "pro-garden",
          description: "Catalog",
          location: "Alabama",
          updatedAt: new Date("2026-02-01T00:00:00.000Z"),
          images: [
            {
              url: "https://example.com/pro.jpg",
              updatedAt: new Date("2026-02-01T00:00:00.000Z"),
            },
          ],
        },
        _count: {
          listings: 120,
          lists: 3,
        },
        lists: [
          {
            id: "list-pro",
            title: "For Sale",
            updatedAt: new Date("2026-02-01T00:00:00.000Z"),
            _count: {
              listings: 120,
            },
          },
        ],
        listings: [{ updatedAt: new Date("2026-02-02T00:00:00.000Z") }],
      },
      {
        id: "user-free",
        stripeCustomerId: "cus-free",
        createdAt: new Date("2021-01-01T00:00:00.000Z"),
        profile: {
          title: "Free Garden",
          slug: "free-garden",
          description: "Catalog",
          location: "Georgia",
          updatedAt: new Date("2026-02-01T00:00:00.000Z"),
          images: [],
        },
        _count: {
          listings: 25,
          lists: 1,
        },
        lists: [
          {
            id: "list-free",
            title: "Collection",
            updatedAt: new Date("2026-02-01T00:00:00.000Z"),
            _count: {
              listings: 25,
            },
          },
        ],
        listings: [{ updatedAt: new Date("2026-02-03T00:00:00.000Z") }],
      },
    ];

    mockDb.user.findMany.mockImplementation((args: unknown) => {
      const filteredById = applyIdWhereFilter(users, args);
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

    const profiles = await getPublicProfiles();

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      id: "user-pro",
      slug: "pro-garden",
      hasActiveSubscription: true,
      listingCount: 120,
    });
  });
});
