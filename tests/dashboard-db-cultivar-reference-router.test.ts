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
  $queryRaw: ReturnType<typeof vi.fn>;
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
  };
}

function createMockDb(): MockDb {
  return {
    $queryRaw: vi.fn(),
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
      { cultivarReferenceId: "cr-1" },
      { cultivarReferenceId: "cr-1" },
      { cultivarReferenceId: "cr-2" },
    ]);
    db.cultivarReference.findMany.mockResolvedValue([cr1, cr2]);

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

    expect(db.cultivarReference.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["cr-1", "cr-2"],
        },
      },
      select: expect.any(Object),
      orderBy: { id: "desc" },
    });
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
      { cultivarReferenceId: "cr-old" },
      { cultivarReferenceId: "cr-new" },
    ]);
    db.cultivarReference.findMany.mockResolvedValue([
      makeCultivarReference("cr-new", new Date("2026-01-02T00:00:00.000Z")),
    ]);

    const caller = createCaller(db);
    const result = await caller.sync({ since: "2026-01-01T00:00:00.000Z" });

    expect(result.map((row) => row.id)).toEqual(["cr-new"]);
    expect(db.cultivarReference.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["cr-old", "cr-new"],
        },
        updatedAt: {
          gte: new Date("2026-01-01T00:00:00.000Z"),
        },
      },
      select: expect.any(Object),
      orderBy: { id: "asc" },
    });
  });

  it("getByIdsBatch fetches large POST-backed ID batches directly", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValue([
      {
        id: "cr-1",
        normalizedName: "cr-1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ahs_id: null,
        ahs_name: null,
        ahs_ahsImageUrl: null,
        ahs_hybridizer: null,
        ahs_year: null,
        ahs_scapeHeight: null,
        ahs_bloomSize: null,
        ahs_bloomSeason: null,
        ahs_ploidy: null,
        ahs_foliageType: null,
        ahs_bloomHabit: null,
        ahs_color: null,
        ahs_form: null,
        ahs_parentage: null,
        ahs_fragrance: null,
        ahs_budcount: null,
        ahs_branches: null,
        ahs_sculpting: null,
        ahs_foliage: null,
        ahs_flower: null,
        v2_id: null,
        v2_post_title: null,
        v2_introduction_date: null,
        v2_primary_hybridizer_name: null,
        v2_hybridizer_code_legacy: null,
        v2_additional_hybridizers_names: null,
        v2_bloom_season_names: null,
        v2_fragrance_names: null,
        v2_bloom_habit_names: null,
        v2_foliage_names: null,
        v2_ploidy_names: null,
        v2_scape_height_in: null,
        v2_bloom_size_in: null,
        v2_bud_count: null,
        v2_branches: null,
        v2_color: null,
        v2_flower_form_names: null,
        v2_unusual_forms_names: null,
        v2_parentage: null,
        v2_image_url: null,
      },
      {
        id: "cr-2",
        normalizedName: "cr-2",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ahs_id: null,
        ahs_name: null,
        ahs_ahsImageUrl: null,
        ahs_hybridizer: null,
        ahs_year: null,
        ahs_scapeHeight: null,
        ahs_bloomSize: null,
        ahs_bloomSeason: null,
        ahs_ploidy: null,
        ahs_foliageType: null,
        ahs_bloomHabit: null,
        ahs_color: null,
        ahs_form: null,
        ahs_parentage: null,
        ahs_fragrance: null,
        ahs_budcount: null,
        ahs_branches: null,
        ahs_sculpting: null,
        ahs_foliage: null,
        ahs_flower: null,
        v2_id: null,
        v2_post_title: null,
        v2_introduction_date: null,
        v2_primary_hybridizer_name: null,
        v2_hybridizer_code_legacy: null,
        v2_additional_hybridizers_names: null,
        v2_bloom_season_names: null,
        v2_fragrance_names: null,
        v2_bloom_habit_names: null,
        v2_foliage_names: null,
        v2_ploidy_names: null,
        v2_scape_height_in: null,
        v2_bloom_size_in: null,
        v2_bud_count: null,
        v2_branches: null,
        v2_color: null,
        v2_flower_form_names: null,
        v2_unusual_forms_names: null,
        v2_parentage: null,
        v2_image_url: null,
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.getByIdsBatch({
      ids: ["cr-1", "cr-2", "cr-1"],
    });

    expect(result.map((row) => row.id)).toEqual(["cr-1", "cr-2"]);
    expect(result[0]).not.toHaveProperty("v2AhsCultivar");
    expect(db.$queryRaw).toHaveBeenCalledOnce();
    expect(db.cultivarReference.findMany).not.toHaveBeenCalled();
  });

  it("getByIdsBatch matches the legacy getByIds display shape", async () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "false";

    const db = createMockDb();
    const updatedAt = new Date("2026-01-01T00:00:00.000Z");
    const ahsListing = {
      id: "ahs-1",
      name: "Coffee Frenzy",
      ahsImageUrl: "https://example.com/legacy.jpg",
      hybridizer: "Legacy Hybridizer",
      year: "2012",
      scapeHeight: "36",
      bloomSize: "6",
      bloomSeason: "Midseason",
      ploidy: "Tetraploid",
      foliageType: "Dormant",
      bloomHabit: "Diurnal",
      color: "Gold with red eye",
      form: "Single",
      parentage: "(A x B)",
      fragrance: "Fragrant",
      budcount: "24",
      branches: "5",
      sculpting: "Pleated",
      foliage: "Dormant",
      flower: "Single",
    };

    db.cultivarReference.findMany.mockResolvedValue([
      {
        id: "cr-1",
        normalizedName: "coffee frenzy",
        updatedAt,
        ahsListing,
      },
    ]);
    db.$queryRaw.mockResolvedValue([
      {
        id: "cr-1",
        normalizedName: "coffee frenzy",
        updatedAt: updatedAt.toISOString(),
        ahs_id: ahsListing.id,
        ahs_name: ahsListing.name,
        ahs_ahsImageUrl: ahsListing.ahsImageUrl,
        ahs_hybridizer: ahsListing.hybridizer,
        ahs_year: ahsListing.year,
        ahs_scapeHeight: ahsListing.scapeHeight,
        ahs_bloomSize: ahsListing.bloomSize,
        ahs_bloomSeason: ahsListing.bloomSeason,
        ahs_ploidy: ahsListing.ploidy,
        ahs_foliageType: ahsListing.foliageType,
        ahs_bloomHabit: ahsListing.bloomHabit,
        ahs_color: ahsListing.color,
        ahs_form: ahsListing.form,
        ahs_parentage: ahsListing.parentage,
        ahs_fragrance: ahsListing.fragrance,
        ahs_budcount: ahsListing.budcount,
        ahs_branches: ahsListing.branches,
        ahs_sculpting: ahsListing.sculpting,
        ahs_foliage: ahsListing.foliage,
        ahs_flower: ahsListing.flower,
      },
    ]);

    const caller = createCaller(db);
    const getByIdsResult = await caller.getByIds({ ids: ["cr-1"] });
    const batchResult = await caller.getByIdsBatch({ ids: ["cr-1"] });

    expect(batchResult).toEqual(getByIdsResult);
  });

  it("getByIdsBatch matches the V2 getByIds display shape", async () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "true";

    const db = createMockDb();
    const updatedAt = new Date("2026-04-08T00:00:00.000Z");
    const v2AhsCultivar = {
      id: "v2-1",
      post_title: "V2 Coffee Frenzy",
      introduction_date: "2024-09-15",
      primary_hybridizer_name: "V2 Hybridizer",
      hybridizer_code_legacy: "V2H",
      additional_hybridizers_names: "Additional Hybridizer",
      bloom_season_names: "Late",
      fragrance_names: "Heavy",
      bloom_habit_names: "Extended",
      foliage_names: "Evergreen",
      ploidy_names: "Diploid",
      scape_height_in: 42,
      bloom_size_in: 7.5,
      bud_count: 30,
      branches: 6,
      color: "V2 color",
      flower_form_names: "Double",
      unusual_forms_names: "Crispate",
      parentage: "(V2 A x V2 B)",
      image_url: "https://example.com/v2.jpg",
    };

    db.cultivarReference.findMany.mockResolvedValue([
      {
        id: "cr-1",
        normalizedName: "coffee frenzy",
        updatedAt,
        v2AhsCultivar,
      },
    ]);
    db.$queryRaw.mockResolvedValue([
      {
        id: "cr-1",
        normalizedName: "coffee frenzy",
        updatedAt: updatedAt.toISOString(),
        v2_id: v2AhsCultivar.id,
        v2_post_title: v2AhsCultivar.post_title,
        v2_introduction_date: v2AhsCultivar.introduction_date,
        v2_primary_hybridizer_name: v2AhsCultivar.primary_hybridizer_name,
        v2_hybridizer_code_legacy: v2AhsCultivar.hybridizer_code_legacy,
        v2_additional_hybridizers_names:
          v2AhsCultivar.additional_hybridizers_names,
        v2_bloom_season_names: v2AhsCultivar.bloom_season_names,
        v2_fragrance_names: v2AhsCultivar.fragrance_names,
        v2_bloom_habit_names: v2AhsCultivar.bloom_habit_names,
        v2_foliage_names: v2AhsCultivar.foliage_names,
        v2_ploidy_names: v2AhsCultivar.ploidy_names,
        v2_scape_height_in: v2AhsCultivar.scape_height_in,
        v2_bloom_size_in: v2AhsCultivar.bloom_size_in,
        v2_bud_count: v2AhsCultivar.bud_count,
        v2_branches: v2AhsCultivar.branches,
        v2_color: v2AhsCultivar.color,
        v2_flower_form_names: v2AhsCultivar.flower_form_names,
        v2_unusual_forms_names: v2AhsCultivar.unusual_forms_names,
        v2_parentage: v2AhsCultivar.parentage,
        v2_image_url: v2AhsCultivar.image_url,
      },
    ]);

    const caller = createCaller(db);
    const getByIdsResult = await caller.getByIds({ ids: ["cr-1"] });
    const batchResult = await caller.getByIdsBatch({ ids: ["cr-1"] });

    expect(batchResult).toEqual(getByIdsResult);
  });

  it("getByIdsBatch keeps the V2 path without returning raw V2 source data", async () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "true";

    const db = createMockDb();
    db.$queryRaw.mockResolvedValue([
      {
        id: "cr-1",
        normalizedName: "coffee frenzy",
        updatedAt: "2026-04-08T00:00:00.000Z",
        v2_id: "v2-1",
        v2_post_title: "V2 Coffee Frenzy",
        v2_introduction_date: "2024-09-15",
        v2_primary_hybridizer_name: "V2 Hybridizer",
        v2_hybridizer_code_legacy: null,
        v2_additional_hybridizers_names: null,
        v2_bloom_season_names: "Late",
        v2_fragrance_names: "Heavy",
        v2_bloom_habit_names: "Extended",
        v2_foliage_names: "Evergreen",
        v2_ploidy_names: "Diploid",
        v2_scape_height_in: 42,
        v2_bloom_size_in: 7.5,
        v2_bud_count: 30,
        v2_branches: 6,
        v2_color: null,
        v2_flower_form_names: "Double",
        v2_unusual_forms_names: "Crispate",
        v2_parentage: "(V2 A x V2 B)",
        v2_image_url: "https://example.com/v2.jpg",
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.getByIdsBatch({ ids: ["cr-1"] });

    expect(result[0]).toMatchObject({
      id: "cr-1",
      normalizedName: "coffee frenzy",
      ahsListing: {
        id: "v2-1",
        name: "V2 Coffee Frenzy",
        hybridizer: "V2 Hybridizer",
        year: "2024",
      },
    });
    expect(result[0]).not.toHaveProperty("v2AhsCultivar");
  });

  it("returns V2-mapped display data when the feature flag is enabled", async () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "true";

    const db = createMockDb();
    db.listing.findMany.mockResolvedValue([{ cultivarReferenceId: "cr-1" }]);
    db.cultivarReference.findMany.mockResolvedValue([
      {
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
          hybridizer_code_legacy: null,
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
    expect(result[0]).not.toHaveProperty("v2AhsCultivar");
  });
});
