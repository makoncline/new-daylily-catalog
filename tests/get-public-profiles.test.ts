// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
  },
}));

const mockGetCachedProUserIds = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: mockDb,
}));

vi.mock("@/server/db/getCachedProUserIds", () => ({
  getCachedProUserIds: mockGetCachedProUserIds,
}));

import { getPublicProfiles } from "@/server/db/getPublicProfiles";
import { applyWhereIn } from "./test-utils/apply-where-in";

describe("getPublicProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only pro catalogs for the /catalogs page", async () => {
    const users = [
      {
        id: "user-pro",
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
        lists: [{ updatedAt: new Date("2026-02-01T00:00:00.000Z") }],
        listings: [{ updatedAt: new Date("2026-02-02T00:00:00.000Z") }],
      },
      {
        id: "user-free",
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
        lists: [{ updatedAt: new Date("2026-02-01T00:00:00.000Z") }],
        listings: [{ updatedAt: new Date("2026-02-03T00:00:00.000Z") }],
      },
    ];

    mockDb.user.findMany.mockImplementation((args: unknown) =>
      Promise.resolve(applyWhereIn(users, args, "id")),
    );

    mockGetCachedProUserIds.mockResolvedValue(["user-pro"]);

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
