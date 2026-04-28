// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/dashboard-db-image.sqlite";

type RouterModule = typeof import("@/server/api/routers/dashboard-db/image");
let dashboardDbImageRouter: RouterModule["dashboardDbImageRouter"];

beforeAll(async () => {
  ({ dashboardDbImageRouter } = await import(
    "@/server/api/routers/dashboard-db/image"
  ));
});

interface MockDb {
  $queryRaw: ReturnType<typeof vi.fn>;
  image: {
    findMany: ReturnType<typeof vi.fn>;
  };
  listing: {
    findMany: ReturnType<typeof vi.fn>;
  };
  userProfile: {
    findUnique: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    $queryRaw: vi.fn(),
    image: {
      findMany: vi.fn(),
    },
    listing: {
      findMany: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
  };
}

function createCaller(db: MockDb) {
  return dashboardDbImageRouter.createCaller({
    db: db as unknown as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  });
}

describe("dashboardDb.image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sync filters images through direct owner foreign keys", async () => {
    const db = createMockDb();
    db.listing.findMany.mockResolvedValue([{ id: "listing-1" }]);
    db.userProfile.findUnique.mockResolvedValue({ id: "profile-1" });
    db.image.findMany.mockResolvedValue([]);

    const caller = createCaller(db);
    await caller.sync({ since: "2026-01-01T00:00:00.000Z" });

    expect(db.listing.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true },
    });
    expect(db.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true },
    });
    expect(db.image.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { listingId: { in: ["listing-1"] } },
                { userProfileId: "profile-1" },
              ],
            },
            { updatedAt: { gte: new Date("2026-01-01T00:00:00.000Z") } },
          ],
        },
      }),
    );
  });

  it("sync returns early when the user has no image owners", async () => {
    const db = createMockDb();
    db.listing.findMany.mockResolvedValue([]);
    db.userProfile.findUnique.mockResolvedValue(null);

    const caller = createCaller(db);
    const result = await caller.sync({ since: null });

    expect(result).toEqual([]);
    expect(db.image.findMany).not.toHaveBeenCalled();
  });

  it("listByListingIds fetches image chunks with indexed owner-checked queries", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValueOnce([
      {
        id: "image-1",
        url: "https://example.com/image.jpg",
        order: 1,
        listingId: "listing-1",
        userProfileId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: null,
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.listByListingIds({
      listingIds: ["listing-1", "listing-1"],
    });

    expect(result).toEqual([
      {
        id: "image-1",
        url: "https://example.com/image.jpg",
        order: 1,
        listingId: "listing-1",
        userProfileId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        status: null,
      },
    ]);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.listing.findMany).not.toHaveBeenCalled();
    expect(db.userProfile.findUnique).not.toHaveBeenCalled();
    expect(db.image.findMany).not.toHaveBeenCalled();
  });
});
