// @vitest-environment node

import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import type * as CultivarReferenceRouterModule from "@/server/api/routers/dashboard-db/cultivar-reference";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-cultivar-reference.sqlite";

let dashboardDbCultivarReferenceRouter: typeof CultivarReferenceRouterModule.dashboardDbCultivarReferenceRouter;

beforeAll(async () => {
  ({ dashboardDbCultivarReferenceRouter } = await import(
    "@/server/api/routers/dashboard-db/cultivar-reference"
  ));
});

interface MockDb {
  $queryRaw: ReturnType<typeof vi.fn>;
  imageAsset: {
    findMany: ReturnType<typeof vi.fn>;
  };
  listing: {
    findMany: ReturnType<typeof vi.fn>;
  };
  cultivarReference: {
    findMany: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    $queryRaw: vi.fn(),
    imageAsset: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    listing: {
      findMany: vi.fn(),
    },
    cultivarReference: {
      findMany: vi.fn(),
    },
  };
}

function createRawV2CultivarReference(
  id: string,
  updatedAt = "2026-01-01T00:00:00.000Z",
) {
  return {
    id,
    normalizedName: id,
    updatedAt,
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

  it("listForUserListings filters cultivar references with an owner-checked query", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValue([
      createRawV2CultivarReference("cr-1"),
      createRawV2CultivarReference("cr-2"),
    ]);

    const caller = createCaller(db);
    const result = await caller.listForUserListings();

    expect(result.map((row) => row.id)).toEqual(["cr-1", "cr-2"]);
    expect(db.$queryRaw).toHaveBeenCalledOnce();
    expect(db.listing.findMany).not.toHaveBeenCalled();
    expect(db.cultivarReference.findMany).not.toHaveBeenCalled();
  });

  it("sync returns an empty page when the owner-checked query has no rows", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValue([]);

    const caller = createCaller(db);
    const result = await caller.sync({ since: null });

    expect(result).toEqual([]);
    expect(db.$queryRaw).toHaveBeenCalledOnce();
    expect(db.cultivarReference.findMany).not.toHaveBeenCalled();
  });

  it("sync maps updated cultivar references from the owner-checked query", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValue([
      createRawV2CultivarReference("cr-new", "2026-01-02T00:00:00.000Z"),
    ]);

    const caller = createCaller(db);
    const result = await caller.sync({
      since: "2026-01-01T00:00:00.000Z",
      cursor: { id: "cr-old" },
      limit: 50,
    });

    expect(result.map((row) => row.id)).toEqual(["cr-new"]);
    expect(result[0]?.updatedAt).toEqual(
      new Date("2026-01-02T00:00:00.000Z"),
    );
    expect(db.$queryRaw).toHaveBeenCalledOnce();
    expect(db.listing.findMany).not.toHaveBeenCalled();
    expect(db.cultivarReference.findMany).not.toHaveBeenCalled();
  });

  it("getByIdsBatch fetches large POST-backed ID batches directly", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValue([
      createRawV2CultivarReference("cr-1"),
      createRawV2CultivarReference("cr-2"),
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

  it("getByIdsBatch matches the getByIds display shape", async () => {
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

  it("returns V2-mapped display data", async () => {
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

  it("chunks generated image asset lookups", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValue(
      Array.from({ length: 901 }, (_, index) =>
        createRawV2CultivarReference(`cr-${index}`),
      ),
    );

    const caller = createCaller(db);
    const result = await caller.listForUserListings();

    expect(result).toHaveLength(901);
    expect(db.imageAsset.findMany.mock.calls.length).toBeGreaterThan(1);
    for (const call of db.imageAsset.findMany.mock.calls) {
      const input = call[0] as {
        where: { cultivarReferenceId: { in: string[] } };
      };

      expect(
        input.where.cultivarReferenceId.in.length,
      ).toBeLessThanOrEqual(400);
    }
  });

  it("uses generated image assets", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValue([createRawV2CultivarReference("cr-1")]);
    db.imageAsset.findMany.mockResolvedValue([
      {
        blurUrl: "https://cdn.example.com/generated-blur.txt",
        cultivarReferenceId: "cr-1",
        displayUrl: "https://cdn.example.com/generated-display.jpg",
        id: "asset-1",
        legacyImageId: null,
        originalUrl: "https://cdn.example.com/generated-original.jpg",
        status: "ready",
        thumbUrl: "https://cdn.example.com/generated-thumb.jpg",
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.listForUserListings();

    expect(db.imageAsset.findMany).toHaveBeenCalledOnce();
    expect(result[0]?.cultivarReferenceImage).toMatchObject({
      imageAsset: {
        displayUrl: "https://cdn.example.com/generated-display.jpg",
        id: "asset-1",
      },
      url: "https://cdn.example.com/generated-display.jpg",
    });
  });
});
