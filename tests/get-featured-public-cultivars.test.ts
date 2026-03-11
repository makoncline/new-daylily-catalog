// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
  listing: {
    groupBy: vi.fn(),
  },
  cultivarReference: {
    findMany: vi.fn(),
  },
}));

const mockGetCachedProUserIds = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: mockDb,
}));

vi.mock("@/server/db/getCachedProUserIds", () => ({
  getCachedProUserIds: (...args: unknown[]) => mockGetCachedProUserIds(...args),
}));

import { getFeaturedPublicCultivars } from "@/server/db/getFeaturedPublicCultivars";

describe("getFeaturedPublicCultivars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns featured cultivars ordered by public offer counts", async () => {
    mockGetCachedProUserIds.mockResolvedValue(["user-1"]);
    mockDb.listing.groupBy.mockResolvedValue([
      {
        cultivarReferenceId: "cultivar-2",
        _count: {
          cultivarReferenceId: 9,
        },
      },
      {
        cultivarReferenceId: "cultivar-1",
        _count: {
          cultivarReferenceId: 6,
        },
      },
    ]);
    mockDb.cultivarReference.findMany.mockResolvedValue([
      {
        id: "cultivar-1",
        normalizedName: "coffee frenzy",
        ahsListing: {
          name: "Coffee Frenzy",
          ahsImageUrl: "https://example.com/coffee.jpg",
          hybridizer: "Reed",
          year: "2012",
        },
      },
      {
        id: "cultivar-2",
        normalizedName: "isle of wight",
        ahsListing: {
          name: "Isle of Wight",
          ahsImageUrl: "https://example.com/isle.jpg",
          hybridizer: "Reed",
          year: "2007",
        },
      },
    ]);

    const results = await getFeaturedPublicCultivars({ limit: 2 });

    expect(results).toEqual([
      {
        id: "cultivar-2",
        name: "Isle of Wight",
        normalizedName: "isle of wight",
        segment: "isle-of-wight",
        imageUrl: "https://example.com/isle.jpg",
        hybridizer: "Reed",
        year: "2007",
        offerCount: 9,
      },
      {
        id: "cultivar-1",
        name: "Coffee Frenzy",
        normalizedName: "coffee frenzy",
        segment: "coffee-frenzy",
        imageUrl: "https://example.com/coffee.jpg",
        hybridizer: "Reed",
        year: "2012",
        offerCount: 6,
      },
    ]);
  });
});
