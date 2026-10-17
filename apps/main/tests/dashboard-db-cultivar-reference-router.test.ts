// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import type * as CultivarReferenceRouterModule from "@/server/api/routers/dashboard-db/cultivar-reference";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-cultivar-reference.sqlite";

let getCultivarReferencesByIdsRaw: typeof CultivarReferenceRouterModule.getCultivarReferencesByIdsRaw;

beforeAll(async () => {
  ({ getCultivarReferencesByIdsRaw } = await import(
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

describe("dashboardDb.cultivarReference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const result = await getCultivarReferencesByIdsRaw(
      db as unknown as TRPCInternalContext["db"],
      ["cr-1"],
    );

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

    const result = await getCultivarReferencesByIdsRaw(
      db as unknown as TRPCInternalContext["db"],
      ["cr-1"],
    );

    expect(result).toHaveLength(901);
    expect(db.imageAsset.findMany.mock.calls.length).toBeGreaterThan(1);
    for (const call of db.imageAsset.findMany.mock.calls) {
      const input = call[0] as {
        where: { cultivarReferenceId: { in: string[] } };
      };

      expect(input.where.cultivarReferenceId.in.length).toBeLessThanOrEqual(
        400,
      );
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

    const result = await getCultivarReferencesByIdsRaw(
      db as unknown as TRPCInternalContext["db"],
      ["cr-1"],
    );

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
