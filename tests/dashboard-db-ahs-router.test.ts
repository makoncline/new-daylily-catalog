// @vitest-environment node

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??= "file:./tests/.tmp/dashboard-db-ahs.sqlite";

type RouterModule = typeof import("@/server/api/routers/dashboard-db/ahs");
let dashboardDbAhsRouter: RouterModule["dashboardDbAhsRouter"];

const originalV2DisplayFlag =
  process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA;

beforeAll(async () => {
  ({ dashboardDbAhsRouter } = await import("@/server/api/routers/dashboard-db/ahs"));
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

function createCaller(db: MockDb) {
  return dashboardDbAhsRouter.createCaller({
    db: db as unknown as TRPCInternalContext["db"],
    _authUser: { id: "user-1" } as unknown as TRPCInternalContext["_authUser"],
    headers: new Headers(),
  });
}

describe("dashboardDb.ahs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalV2DisplayFlag === undefined) {
      delete process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA;
      return;
    }

    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = originalV2DisplayFlag;
  });

  it("returns V2-mapped cultivar detail data when the feature flag is enabled", async () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "true";

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
      scapeHeight: "42 inches",
      bloomSize: "7.5 inches",
      bloomSeason: "Late",
      fragrance: null,
      color: null,
      parentage: "(V2 A x V2 B)",
    });
  });

  it("uses the display cultivar name for search results when the feature flag is enabled", async () => {
    process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA = "true";

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
});
