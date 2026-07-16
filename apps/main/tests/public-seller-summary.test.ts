// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  keyValue: {
    findMany: vi.fn(),
  },
  list: {
    groupBy: vi.fn(),
  },
  listing: {
    groupBy: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({
  db: mockDb,
  replicaDb: mockDb,
}));

import { getPublicSellerSummary } from "@/server/db/public-seller-read-model";

describe("public seller summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$queryRaw.mockResolvedValue([{ updatedAtMs: null }]);

    mockDb.user.findMany
      .mockResolvedValueOnce([
        {
          id: "seller-1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          profile: {
            title: "Seller",
            slug: "seller",
            description: null,
            location: null,
            updatedAt: new Date("2026-01-02T00:00:00.000Z"),
            images: [],
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "seller-1",
          stripeCustomerId: "cus_seller_1",
        },
      ]);
    mockDb.listing.groupBy.mockResolvedValue([
      {
        userId: "seller-1",
        _count: { _all: 3036 },
        _max: { updatedAt: new Date("2026-06-01T00:00:00.000Z") },
      },
    ]);
    mockDb.list.groupBy.mockResolvedValue([
      {
        userId: "seller-1",
        _count: { _all: 7 },
        _max: { updatedAt: new Date("2026-05-01T00:00:00.000Z") },
      },
    ]);
    mockDb.keyValue.findMany.mockResolvedValue([
      {
        key: "stripe:customer:cus_seller_1",
        value: JSON.stringify({ status: "active" }),
      },
    ]);
  });

  it("uses aggregate freshness and limits subscription reads to the requested seller", async () => {
    const summary = await getPublicSellerSummary("seller-1");

    expect(summary).toMatchObject({
      id: "seller-1",
      listingCount: 3036,
      listCount: 7,
      hasActiveSubscription: true,
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const baseUserSelect = mockDb.user.findMany.mock.calls[0]?.[0].select;
    expect(baseUserSelect).not.toHaveProperty("listings");
    expect(baseUserSelect).not.toHaveProperty("lists");
    expect(baseUserSelect).not.toHaveProperty("_count");
    expect(mockDb.user.findMany.mock.calls[1]?.[0].where.id.in).toEqual([
      "seller-1",
    ]);
    expect(mockDb.keyValue.findMany.mock.calls[0]?.[0].where.key.in).toEqual([
      "stripe:customer:cus_seller_1",
    ]);
  });
});
