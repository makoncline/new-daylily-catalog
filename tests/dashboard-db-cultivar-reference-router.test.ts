// @vitest-environment node

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-cultivar-reference.sqlite";

type RouterModule =
  typeof import("@/server/api/routers/dashboard-db/cultivar-reference");
let dashboardDbCultivarReferenceRouter: RouterModule["dashboardDbCultivarReferenceRouter"];
const originalV2DisplayFlag =
  process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA;

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

function makeCultivarReference(
  id: string,
  updatedAt = new Date("2026-01-01T00:00:00.000Z"),
) {
  return {
    id,
    normalizedName: id,
    updatedAt,
    ahsListing: null,
    v2AhsCultivar: null,
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

  afterEach(() => {
    if (originalV2DisplayFlag === undefined) {
      delete process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA;
      return;
    }

    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA =
      originalV2DisplayFlag;
  });

  it("listForUserListings derives unique cultivar reference IDs from user listings", async () => {
    const db = createMockDb();
    const cr1 = makeCultivarReference("cr-1");
    const cr2 = makeCultivarReference("cr-2");
    db.listing.findMany.mockResolvedValue([
      { cultivarReferenceId: "cr-1", cultivarReference: cr1 },
      { cultivarReferenceId: "cr-1", cultivarReference: cr1 },
      { cultivarReferenceId: "cr-2", cultivarReference: cr2 },
    ]);

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
        cultivarReference: expect.any(Object),
      },
    });

    expect(db.cultivarReference.findMany).not.toHaveBeenCalled();
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
    db.listing.findMany.mockResolvedValue([
      {
        cultivarReferenceId: "cr-old",
        cultivarReference: makeCultivarReference(
          "cr-old",
          new Date("2025-12-31T00:00:00.000Z"),
        ),
      },
      {
        cultivarReferenceId: "cr-new",
        cultivarReference: makeCultivarReference(
          "cr-new",
          new Date("2026-01-02T00:00:00.000Z"),
        ),
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.sync({ since: "2026-01-01T00:00:00.000Z" });

    expect(result.map((row) => row.id)).toEqual(["cr-new"]);
    expect(db.cultivarReference.findMany).not.toHaveBeenCalled();
  });

  it("returns V2-mapped display data when the feature flag is enabled", async () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "true";

    const db = createMockDb();
    db.listing.findMany.mockResolvedValue([
      {
        cultivarReferenceId: "cr-1",
        cultivarReference: {
          id: "cr-1",
          normalizedName: "coffee frenzy",
          updatedAt: new Date("2026-04-08T00:00:00.000Z"),
          ahsListing: {
            id: "ahs-1",
            name: "Legacy Coffee Frenzy",
            ahsImageUrl: "https://example.com/legacy.jpg",
            hybridizer: "Legacy Hybridizer",
            year: "2012",
            scapeHeight: "36 inches",
            bloomSize: "6 inches",
            bloomSeason: "Midseason",
            form: "Single",
            ploidy: "Tet",
            foliageType: "Dormant",
            bloomHabit: "Diurnal",
            budcount: "24",
            branches: "5",
            sculpting: null,
            foliage: null,
            flower: null,
            fragrance: null,
            parentage: "(Legacy A x Legacy B)",
            color: "Legacy color",
          },
          v2AhsCultivar: {
            id: "v2-1",
            post_title: "V2 Coffee Frenzy",
            introduction_date: "2024-09-15",
            primary_hybridizer_name: "V2 Hybridizer",
            additional_hybridizers_names: null,
            bloom_season_names: "Late",
            fragrance_names: "Heavy",
            bloom_habit_names: "Extended",
            foliage_names: "Evergreen",
            ploidy_names: "Diploid",
            scape_height_in: 42,
            bloom_size_in: 7.5,
            bud_count: 30,
            branches: 6,
            color: null,
            flower_form_names: "Double",
            unusual_forms_names: "Crispate",
            parentage: "(V2 A x V2 B)",
            image_url: "https://example.com/v2.jpg",
          },
        },
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.listForUserListings();

    expect(result[0]?.ahsListing).toMatchObject({
      id: "v2-1",
      name: "V2 Coffee Frenzy",
      ahsImageUrl: "https://example.com/v2.jpg",
      hybridizer: "V2 Hybridizer",
      year: "2024",
      bloomSeason: "Late",
      color: null,
    });
  });
});
