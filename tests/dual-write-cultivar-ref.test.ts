// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??= "file:./tests/.tmp/cultivar-reference-unit.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";

type ListingRouterModule = typeof import("@/server/api/routers/listing");
let listingRouter: ListingRouterModule["listingRouter"];

beforeAll(async () => {
  ({ listingRouter } = await import("@/server/api/routers/listing"));
});

interface MockDb {
  listing: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  cultivarReference: {
    findUnique: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    listing: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    cultivarReference: {
      findUnique: vi.fn(),
    },
  };
}

function createCaller(db: MockDb) {
  return listingRouter.createCaller({
    db: db as never,
    user: { id: "user-1" } as never,
    headers: new Headers(),
  });
}

describe("listing cultivar reference linking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not touch cultivarReferenceId when update input omits link fields", async () => {
    const db = createMockDb();
    db.listing.findUnique.mockResolvedValue({ id: "listing-1", title: "Old" });
    db.listing.update.mockResolvedValue({ id: "listing-1" });

    const caller = createCaller(db);
    await caller.update({
      id: "listing-1",
      data: { description: "Updated description" },
    });

    const updateArgs = db.listing.update.mock.calls[0]?.[0];
    expect(updateArgs?.data).not.toHaveProperty("cultivarReferenceId");
    expect(db.cultivarReference.findUnique).not.toHaveBeenCalled();
  });

  it("linkAhs writes cultivarReferenceId", async () => {
    const db = createMockDb();
    db.listing.findUnique.mockResolvedValue({ id: "listing-1" });
    db.cultivarReference.findUnique.mockResolvedValue({
      id: "cr-ahs-1",
      ahsListing: { name: "Coffee Frenzy" },
    });
    db.listing.update.mockResolvedValue({ id: "listing-1" });

    const caller = createCaller(db);
    await caller.linkAhs({
      id: "listing-1",
      cultivarReferenceId: "cr-ahs-1",
      syncName: false,
    });

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cultivarReferenceId: "cr-ahs-1",
          title: undefined,
        }),
      }),
    );
  });

  it("linkAhs syncs title from cultivar reference when syncName is true", async () => {
    const db = createMockDb();
    db.listing.findUnique.mockResolvedValue({ id: "listing-1" });
    db.cultivarReference.findUnique.mockResolvedValue({
      id: "cr-ahs-1",
      ahsListing: { name: "Coffee Frenzy" },
    });
    db.listing.update.mockResolvedValue({ id: "listing-1" });

    const caller = createCaller(db);
    await caller.linkAhs({
      id: "listing-1",
      cultivarReferenceId: "cr-ahs-1",
      syncName: true,
    });

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cultivarReferenceId: "cr-ahs-1",
          title: "Coffee Frenzy",
        }),
      }),
    );
  });

  it("unlinkAhs clears cultivarReferenceId", async () => {
    const db = createMockDb();
    db.listing.findUnique.mockResolvedValue({ id: "listing-1" });
    db.listing.update.mockResolvedValue({ id: "listing-1" });

    const caller = createCaller(db);
    await caller.unlinkAhs({ id: "listing-1" });

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          cultivarReferenceId: null,
        },
      }),
    );
  });

  it("throws a clear error when cultivar reference rows are missing", async () => {
    const db = createMockDb();
    db.listing.findUnique.mockResolvedValue({ id: "listing-1", title: "Old" });
    db.cultivarReference.findUnique.mockResolvedValue(null);

    const caller = createCaller(db);

    await expect(
      caller.linkAhs({
        id: "listing-1",
        cultivarReferenceId: "cr-missing",
        syncName: false,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: expect.stringContaining("Cultivar reference not found"),
    });
  });
});
