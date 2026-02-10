// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??= "file:./tests/.tmp/dual-write-unit.sqlite";
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
  ahsListing: {
    findUnique: ReturnType<typeof vi.fn>;
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
    ahsListing: {
      findUnique: vi.fn(),
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

describe("listing dual-write cultivar reference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not touch ahs fields when update input omits ahsId", async () => {
    const db = createMockDb();
    db.listing.findUnique.mockResolvedValue({ id: "listing-1", title: "Old" });
    db.listing.update.mockResolvedValue({ id: "listing-1" });

    const caller = createCaller(db);
    await caller.update({
      id: "listing-1",
      data: { description: "Updated description" },
    });

    const updateArgs = db.listing.update.mock.calls[0]?.[0];
    expect(updateArgs?.data).not.toHaveProperty("ahsId");
    expect(updateArgs?.data).not.toHaveProperty("cultivarReferenceId");
    expect(db.ahsListing.findUnique).not.toHaveBeenCalled();
    expect(db.cultivarReference.findUnique).not.toHaveBeenCalled();
  });

  it("linkAhs with cultivarReferenceId writes both ahsId and cultivarReferenceId", async () => {
    const db = createMockDb();
    db.listing.findUnique.mockResolvedValue({ id: "listing-1" });
    db.cultivarReference.findUnique.mockImplementation((args: { where: { id?: string; ahsId?: string } }) => {
      if ("id" in args.where && args.where.id === "cr-1") {
        return Promise.resolve({ ahsId: "ahs-1" });
      }
      return Promise.resolve(null);
    });
    db.ahsListing.findUnique.mockResolvedValue({
      id: "ahs-1",
      name: "Coffee Frenzy",
    });
    db.listing.update.mockResolvedValue({ id: "listing-1" });

    const caller = createCaller(db);
    await caller.linkAhs({
      id: "listing-1",
      cultivarReferenceId: "cr-1",
      syncName: false,
    });

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ahsId: "ahs-1",
          cultivarReferenceId: "cr-1",
        }),
      }),
    );
  });

  it("unlinkAhs clears both ahsId and cultivarReferenceId", async () => {
    const db = createMockDb();
    db.listing.findUnique.mockResolvedValue({ id: "listing-1" });
    db.listing.update.mockResolvedValue({ id: "listing-1" });

    const caller = createCaller(db);
    await caller.unlinkAhs({ id: "listing-1" });

    expect(db.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          ahsId: null,
          cultivarReferenceId: null,
        },
      }),
    );
  });

  it("throws when cultivar reference is missing", async () => {
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
