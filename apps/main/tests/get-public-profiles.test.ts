// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => ({
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

const mockGetProUserIds = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: mockDb,
  replicaDb: mockDb,
}));

vi.mock("@/server/db/getProUserIds", () => ({
  getProUserIds: mockGetProUserIds,
}));

import { getPublicProfiles } from "@/server/db/getPublicProfiles";
import { applyWhereIn } from "./test-utils/apply-where-in";

const originalUseImageAssets = process.env.USE_IMAGE_ASSETS;

describe("getPublicProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalUseImageAssets === undefined) {
      delete process.env.USE_IMAGE_ASSETS;
      return;
    }

    process.env.USE_IMAGE_ASSETS = originalUseImageAssets;
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
              id: "image-pro",
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

    mockGetProUserIds.mockResolvedValue(["user-pro"]);
    mockDb.listing.groupBy.mockResolvedValue([
      {
        userId: "user-pro",
        _count: { _all: 120 },
        _max: { updatedAt: new Date("2026-02-02T00:00:00.000Z") },
      },
      {
        userId: "user-free",
        _count: { _all: 25 },
        _max: { updatedAt: new Date("2026-02-03T00:00:00.000Z") },
      },
    ]);
    mockDb.list.groupBy.mockResolvedValue([
      {
        userId: "user-pro",
        _count: { _all: 3 },
        _max: { updatedAt: new Date("2026-02-01T00:00:00.000Z") },
      },
      {
        userId: "user-free",
        _count: { _all: 1 },
        _max: { updatedAt: new Date("2026-02-01T00:00:00.000Z") },
      },
    ]);

    const profiles = await getPublicProfiles();

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      id: "user-pro",
      slug: "pro-garden",
      hasActiveSubscription: true,
      listingCount: 120,
    });
  });

  it("keeps ImageAsset metadata on profile images when enabled", async () => {
    process.env.USE_IMAGE_ASSETS = "true";
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
              id: "profile-image",
              url: "https://legacy.example/profile.jpg",
              updatedAt: new Date("2026-02-01T00:00:00.000Z"),
            },
          ],
          imageAssets: [
            {
              id: "profile-image",
              legacyImageId: "profile-image",
              status: "ready",
              originalUrl: "https://media.example/original.jpg",
              displayUrl: "https://media.example/display.webp",
              thumbUrl: "https://media.example/thumb.webp",
              blurUrl: "https://media.example/blur.webp",
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
    ];

    mockDb.user.findMany.mockImplementation((args: unknown) =>
      Promise.resolve(applyWhereIn(users, args, "id")),
    );
    mockGetProUserIds.mockResolvedValue(["user-pro"]);
    mockDb.listing.groupBy.mockResolvedValue([
      {
        userId: "user-pro",
        _count: { _all: 120 },
        _max: { updatedAt: new Date("2026-02-02T00:00:00.000Z") },
      },
    ]);
    mockDb.list.groupBy.mockResolvedValue([
      {
        userId: "user-pro",
        _count: { _all: 3 },
        _max: { updatedAt: new Date("2026-02-01T00:00:00.000Z") },
      },
    ]);

    const [profile] = await getPublicProfiles();

    expect(profile?.images[0]?.url).toBe("https://media.example/display.webp");
    expect(profile?.images[0]?.imageAsset?.blurUrl).toBe(
      "https://media.example/blur.webp",
    );
  });
});
