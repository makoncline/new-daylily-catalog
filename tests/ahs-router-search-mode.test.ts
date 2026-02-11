// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LOCAL_DATABASE_URL ??= "file:./tests/.tmp/ahs-router-unit.sqlite";
process.env.TURSO_DATABASE_URL ??= "libsql://unit-test-db";
process.env.TURSO_DATABASE_AUTH_TOKEN ??= "unit-test-token";
process.env.PLAYWRIGHT_LOCAL_E2E = "true";

const mockReportError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/error-utils", () => ({
  reportError: mockReportError,
}));

type AhsRouterModule = typeof import("@/server/api/routers/ahs");
let ahsRouter: AhsRouterModule["ahsRouter"];

beforeAll(async () => {
  ({ ahsRouter } = await import("@/server/api/routers/ahs"));
});

interface MockDb {
  cultivarReference: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
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

describe("ahs router cultivar reference paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches by cultivar reference normalized name", async () => {
    const db = createMockDb();
    db.cultivarReference.findMany.mockResolvedValue([
      {
        id: "cr-1",
        ahsId: "ahs-1",
        normalizedName: "happy returns",
        ahsListing: { name: "Happy Returns (AHS)" },
      },
    ]);

    const caller = createCaller(db);
    const results = await caller.search({
      query: "Happy",
    });

    expect(db.cultivarReference.findMany).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      {
        id: "ahs-1",
        name: "Happy Returns (AHS)",
        cultivarReferenceId: "cr-1",
      },
    ]);
    expect(mockReportError).not.toHaveBeenCalled();
  });

  it("reports and falls back to normalized name when ahs display name is missing", async () => {
    const db = createMockDb();
    db.cultivarReference.findMany.mockResolvedValue([
      {
        id: "cr-2",
        ahsId: "ahs-2",
        normalizedName: "fall back name",
        ahsListing: { name: null },
      },
    ]);

    const caller = createCaller(db);
    const results = await caller.search({
      query: "fall",
    });

    expect(results).toEqual([
      {
        id: "ahs-2",
        name: "fall back name",
        cultivarReferenceId: "cr-2",
      },
    ]);

    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warning",
        context: expect.objectContaining({
          source: "ahsRouter.search",
          cultivarReferenceId: "cr-2",
          ahsId: "ahs-2",
          normalizedName: "fall back name",
        }),
      }),
    );
  });

  it("looks up detail by cultivar reference ahsId relation", async () => {
    const db = createMockDb();
    db.cultivarReference.findUnique.mockResolvedValue({
      ahsListing: {
        id: "ahs-1",
        name: "Happy Returns (AHS)",
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
    });

    expect(db.cultivarReference.findUnique).toHaveBeenCalledTimes(1);
    expect(result.name).toBe("Happy Returns (AHS)");
  });
});
