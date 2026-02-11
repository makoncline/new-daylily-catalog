// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??= "file:./tests/.tmp/ahs-router-unit.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";
process.env.PLAYWRIGHT_LOCAL_E2E = "true";

type AhsRouterModule = typeof import("@/server/api/routers/ahs");
let ahsRouter: AhsRouterModule["ahsRouter"];

beforeAll(async () => {
  ({ ahsRouter } = await import("@/server/api/routers/ahs"));
});

interface MockDb {
  ahsListing: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  cultivarReference: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    ahsListing: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    cultivarReference: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
}

function createCaller(db: MockDb) {
  return ahsRouter.createCaller({
    db: db as never,
    user: { id: "user-1" } as never,
    headers: new Headers(),
  });
}

describe("ahs router search and lookup modes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses legacy AHS search when cultivar search flag is false", async () => {
    const db = createMockDb();
    db.ahsListing.findMany.mockResolvedValue([
      {
        id: "ahs-1",
        name: "Coffee Two",
        cultivarReference: { id: "cr-1" },
      },
    ]);

    const caller = createCaller(db);
    const results = await caller.search({
      query: "Coffee",
      useCultivarReferenceSearch: false,
    });

    expect(db.ahsListing.findMany).toHaveBeenCalledTimes(1);
    expect(db.cultivarReference.findMany).not.toHaveBeenCalled();
    expect(results).toEqual([
      {
        id: "ahs-1",
        name: "Coffee Two",
        cultivarReferenceId: "cr-1",
      },
    ]);
  });

  it("uses cultivar-reference search when cultivar search flag is true", async () => {
    const db = createMockDb();
    db.cultivarReference.findMany.mockResolvedValue([
      {
        id: "cr-1",
        normalizedName: "happy returns",
        ahsListing: { id: "ahs-1" },
      },
    ]);

    const caller = createCaller(db);
    const results = await caller.search({
      query: "Happy",
      useCultivarReferenceSearch: true,
    });

    expect(db.cultivarReference.findMany).toHaveBeenCalledTimes(1);
    expect(db.ahsListing.findMany).not.toHaveBeenCalled();
    expect(results).toEqual([
      {
        id: "ahs-1",
        name: "Happy returns",
        cultivarReferenceId: "cr-1",
      },
    ]);
  });

  it("uses legacy AHS lookup when cultivar lookup flag is false", async () => {
    const db = createMockDb();
    db.ahsListing.findUnique.mockResolvedValue({
      id: "ahs-1",
      name: "Legacy Name",
      ahsImageUrl: null,
      hybridizer: null,
      year: null,
      scapeHeight: null,
      bloomSize: null,
      bloomSeason: null,
      form: null,
      ploidy: null,
      foliageType: null,
      bloomHabit: null,
      budcount: null,
      branches: null,
      sculpting: null,
      foliage: null,
      flower: null,
      fragrance: null,
      parentage: null,
      color: null,
    });

    const caller = createCaller(db);
    const result = await caller.get({
      id: "ahs-1",
      useCultivarReferenceLookup: false,
    });

    expect(db.ahsListing.findUnique).toHaveBeenCalledTimes(1);
    expect(db.cultivarReference.findUnique).not.toHaveBeenCalled();
    expect(result.name).toBe("Legacy Name");
  });

  it("uses cultivar-reference lookup when cultivar lookup flag is true", async () => {
    const db = createMockDb();
    db.cultivarReference.findUnique.mockResolvedValue({
      normalizedName: "happy returns",
      ahsListing: {
        id: "ahs-1",
        name: null,
        ahsImageUrl: null,
        hybridizer: null,
        year: null,
        scapeHeight: null,
        bloomSize: null,
        bloomSeason: null,
        form: null,
        ploidy: null,
        foliageType: null,
        bloomHabit: null,
        budcount: null,
        branches: null,
        sculpting: null,
        foliage: null,
        flower: null,
        fragrance: null,
        parentage: null,
        color: null,
      },
    });

    const caller = createCaller(db);
    const result = await caller.get({
      id: "ahs-1",
      useCultivarReferenceLookup: true,
    });

    expect(db.cultivarReference.findUnique).toHaveBeenCalledTimes(1);
    expect(db.ahsListing.findUnique).not.toHaveBeenCalled();
    expect(result.name).toBe("Happy returns");
  });
});
