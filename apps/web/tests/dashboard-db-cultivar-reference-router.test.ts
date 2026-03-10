// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??= "file:./tests/.tmp/dashboard-db-cultivar-reference.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";

type RouterModule = typeof import("@/server/api/routers/dashboard-db/cultivar-reference");
let dashboardDbCultivarReferenceRouter: RouterModule["dashboardDbCultivarReferenceRouter"];

beforeAll(async () => {
  ({ dashboardDbCultivarReferenceRouter } = await import(
    "@/server/api/routers/dashboard-db/cultivar-reference"
  ));
});

interface MockDb {
  listing: {
    findMany: ReturnType<typeof vi.fn>;
  };
  cultivarReference: {
    findMany: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    listing: {
      findMany: vi.fn(),
    },
    cultivarReference: {
      findMany: vi.fn(),
    },
  };
}

function createCaller(db: MockDb) {
  return dashboardDbCultivarReferenceRouter.createCaller({
    db: db as unknown as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  });
}

describe("dashboardDb.cultivarReference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listForUserListings derives unique cultivar reference IDs from user listings", async () => {
    const db = createMockDb();
    db.listing.findMany.mockResolvedValue([
      { cultivarReferenceId: "cr-1" },
      { cultivarReferenceId: "cr-1" },
      { cultivarReferenceId: "cr-2" },
    ]);
    db.cultivarReference.findMany.mockResolvedValue([{ id: "cr-1" }, { id: "cr-2" }]);

    const caller = createCaller(db);
    await caller.listForUserListings();

    expect(db.listing.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        cultivarReferenceId: {
          not: null,
        },
      },
      select: {
        cultivarReferenceId: true,
      },
    });

    expect(db.cultivarReference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            in: ["cr-1", "cr-2"],
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    );
  });

  it("sync returns early when the user has no linked cultivar references", async () => {
    const db = createMockDb();
    db.listing.findMany.mockResolvedValue([]);

    const caller = createCaller(db);
    const result = await caller.sync({ since: null });

    expect(result).toEqual([]);
    expect(db.cultivarReference.findMany).not.toHaveBeenCalled();
  });

  it("sync applies updatedAt lower bound when since is provided", async () => {
    const db = createMockDb();
    db.listing.findMany.mockResolvedValue([{ cultivarReferenceId: "cr-1" }]);
    db.cultivarReference.findMany.mockResolvedValue([]);

    const caller = createCaller(db);
    await caller.sync({ since: "2026-01-01T00:00:00.000Z" });

    expect(db.cultivarReference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["cr-1"] },
          updatedAt: { gte: new Date("2026-01-01T00:00:00.000Z") },
        }),
        orderBy: { updatedAt: "asc" },
      }),
    );
  });
});
