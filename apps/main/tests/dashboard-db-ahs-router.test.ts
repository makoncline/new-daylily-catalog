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

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/dashboard-db-ahs.sqlite";

type RouterModule = typeof import("@/server/api/routers/dashboard-db/ahs");
let dashboardDbAhsRouter: RouterModule["dashboardDbAhsRouter"];

beforeAll(async () => {
  ({ dashboardDbAhsRouter } = await import(
    "@/server/api/routers/dashboard-db/ahs"
  ));
});

interface MockDb {
  cultivarReference: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
}

function createMockDb(): MockDb {
  return {
    cultivarReference: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

function createCaller(db: MockDb, replicaDb = db) {
  return dashboardDbAhsRouter.createCaller({
    db: db as unknown as TRPCInternalContext["db"],
    replicaDb: replicaDb as unknown as TRPCInternalContext["replicaDb"],
    _authUser: { id: "user-1" } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  });
}

describe("dashboardDb.ahs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns V2-mapped cultivar detail data", async () => {
    const db = createMockDb();
    db.cultivarReference.findUnique.mockResolvedValue({
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
        fragrance: "Light",
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
        fragrance_names: null,
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
    });

    const caller = createCaller(db);
    const result = await caller.get({ id: "ahs-1" });

    expect(result).toMatchObject({
      id: "v2-1",
      name: "V2 Coffee Frenzy",
      ahsImageUrl: "https://example.com/v2.jpg",
      hybridizer: "V2 Hybridizer",
      year: "2024",
      scapeHeight: '42"',
      bloomSize: '7.5"',
      bloomSeason: "Late",
      fragrance: null,
      color: null,
      parentage: "(V2 A x V2 B)",
    });
  });

  it("reads cultivar details from the replica database when it is available", async () => {
    const db = createMockDb();
    const replicaDb = createMockDb();
    replicaDb.cultivarReference.findUnique.mockResolvedValue({
      ahsListing: null,
      v2AhsCultivar: {
        id: "cr-replica",
        post_title: "Replica Coffee Frenzy",
        introduction_date: null,
        primary_hybridizer_name: null,
        hybridizer_code_legacy: null,
        additional_hybridizers_names: null,
        bloom_season_names: null,
        fragrance_names: null,
        bloom_habit_names: null,
        foliage_names: null,
        ploidy_names: null,
        scape_height_in: null,
        bloom_size_in: null,
        bud_count: null,
        branches: null,
        color: null,
        flower_form_names: null,
        unusual_forms_names: null,
        parentage: null,
        image_url: null,
      },
    });

    const caller = createCaller(db, replicaDb);
    const result = await caller.get({ id: "cr-replica" });

    expect(result.name).toBe("Replica Coffee Frenzy");
    expect(replicaDb.cultivarReference.findUnique).toHaveBeenCalledOnce();
    expect(db.cultivarReference.findUnique).not.toHaveBeenCalled();
  });

  it("uses generated-only image assets", async () => {
    const db = createMockDb();
    db.cultivarReference.findUnique.mockResolvedValue({
      id: "cr-generated-only",
      ahsListing: null,
      v2AhsCultivar: {
        id: "cr-generated-only",
        post_title: "Generated Only Preview",
        introduction_date: null,
        primary_hybridizer_name: null,
        hybridizer_code_legacy: null,
        additional_hybridizers_names: null,
        bloom_season_names: null,
        fragrance_names: null,
        bloom_habit_names: null,
        foliage_names: null,
        ploidy_names: null,
        scape_height_in: null,
        bloom_size_in: null,
        bud_count: null,
        branches: null,
        color: null,
        flower_form_names: null,
        unusual_forms_names: null,
        parentage: null,
        image_url: null,
      },
      imageAssets: [
        {
          blurUrl: "https://cdn.example.com/generated-blur.txt",
          displayUrl: "https://cdn.example.com/generated-display.jpg",
          id: "asset-1",
          legacyImageId: null,
          originalUrl: "https://cdn.example.com/generated-original.jpg",
          status: "ready",
          thumbUrl: "https://cdn.example.com/generated-thumb.jpg",
        },
      ],
    });

    const caller = createCaller(db);
    const result = await caller.get({ id: "cr-generated-only" });

    expect(result.cultivarReferenceImage).toMatchObject({
      imageAsset: {
        displayUrl: "https://cdn.example.com/generated-display.jpg",
        id: "asset-1",
      },
      url: "https://cdn.example.com/generated-display.jpg",
    });
  });

  it("falls back to the decoded legacy hybridizer code for dashboard cultivar detail reads", async () => {
    const db = createMockDb();
    db.cultivarReference.findUnique.mockResolvedValue({
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
        fragrance: "Light",
        parentage: "(Legacy A x Legacy B)",
        color: "Legacy color",
      },
      v2AhsCultivar: {
        id: "v2-legacy-fallback",
        post_title: "V2 Coffee Frenzy",
        introduction_date: "2024-09-15",
        primary_hybridizer_name: "  ",
        hybridizer_code_legacy: "Thibault-Lipp&eacute;",
        additional_hybridizers_names: null,
        bloom_season_names: "Late",
        fragrance_names: null,
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
    });

    const caller = createCaller(db);
    const result = await caller.get({ id: "ahs-1" });

    expect(result).toMatchObject({
      id: "v2-legacy-fallback",
      hybridizer: "Thibault-Lippé",
      year: "2024",
    });
  });

  it("uses the display cultivar name for search results", async () => {
    const db = createMockDb();
    db.cultivarReference.findMany.mockResolvedValue([
      {
        id: "cr-1",
        ahsId: "ahs-1",
        normalizedName: "coffee frenzy",
        ahsListing: {
          id: "ahs-1",
          name: "Legacy Coffee Frenzy",
          ahsImageUrl: null,
          hybridizer: "Legacy Hybridizer",
          year: "2012",
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
        v2AhsCultivar: {
          id: "v2-1",
          post_title: "V2 Coffee Frenzy",
          introduction_date: "2024-09-15",
          primary_hybridizer_name: "V2 Hybridizer",
          hybridizer_code_legacy: null,
          additional_hybridizers_names: null,
          bloom_season_names: null,
          fragrance_names: null,
          bloom_habit_names: null,
          foliage_names: null,
          ploidy_names: null,
          scape_height_in: null,
          bloom_size_in: null,
          bud_count: null,
          branches: null,
          color: null,
          flower_form_names: null,
          unusual_forms_names: null,
          parentage: null,
          image_url: null,
        },
      },
    ]);

    const caller = createCaller(db);
    const result = await caller.search({ query: "coffee" });

    expect(result).toEqual([
      {
        id: "cr-1",
        name: "V2 Coffee Frenzy",
        cultivarReferenceId: "cr-1",
      },
    ]);
  });

  it("reads cultivar search results from the replica database when it is available", async () => {
    const db = createMockDb();
    const replicaDb = createMockDb();
    replicaDb.cultivarReference.findMany.mockResolvedValue([
      {
        id: "cr-replica",
        ahsId: null,
        normalizedName: "replica coffee frenzy",
        ahsListing: null,
        v2AhsCultivar: {
          id: "cr-replica",
          post_title: "Replica Coffee Frenzy",
          introduction_date: null,
          primary_hybridizer_name: null,
          hybridizer_code_legacy: null,
          additional_hybridizers_names: null,
          bloom_season_names: null,
          fragrance_names: null,
          bloom_habit_names: null,
          foliage_names: null,
          ploidy_names: null,
          scape_height_in: null,
          bloom_size_in: null,
          bud_count: null,
          branches: null,
          color: null,
          flower_form_names: null,
          unusual_forms_names: null,
          parentage: null,
          image_url: null,
        },
      },
    ]);

    const caller = createCaller(db, replicaDb);
    const result = await caller.search({ query: "replica" });

    expect(result).toEqual([
      {
        id: "cr-replica",
        name: "Replica Coffee Frenzy",
        cultivarReferenceId: "cr-replica",
      },
    ]);
    expect(replicaDb.cultivarReference.findMany).toHaveBeenCalledOnce();
    expect(db.cultivarReference.findMany).not.toHaveBeenCalled();
  });

  it("does not expose legacy-only cultivar references in V2 search", async () => {
    const db = createMockDb();
    db.cultivarReference.findMany.mockResolvedValue([]);

    const caller = createCaller(db);
    const result = await caller.search({ query: "when you wish" });

    expect(db.cultivarReference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          v2AhsCultivar: { isNot: null },
          normalizedName: { startsWith: "when you wish" },
        }),
      }),
    );
    expect(result).toEqual([]);
  });
});
