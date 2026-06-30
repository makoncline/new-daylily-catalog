import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { PrismaClient } from "@prisma/client";
import {
  mapV2AhsCultivarToDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import type {
  AhsDisplayListing,
  V2AhsCultivarDisplaySource,
} from "@/lib/utils/ahs-display";
import {
  type CultivarReferenceImageView,
  resolveCultivarReferenceImage,
  shouldQueryGeneratedCultivarImageAssets,
} from "@/server/services/cultivar-reference-image-read-model";
import { imageAssetUrlSelect } from "@/server/services/image-asset-read-model";
import {
  dashboardSyncInputSchema,
  parseDashboardSyncSince,
} from "./dashboard-db-router-helpers";

const v2CultivarReferenceSelect = {
  id: true,
  normalizedName: true,
  updatedAt: true,
  v2AhsCultivar: {
    select: v2AhsCultivarDisplaySelect,
  },
} as const;

type DashboardCultivarReference = {
  id: string;
  normalizedName: string | null;
  updatedAt: Date;
  ahsListing: AhsDisplayListing | null;
  cultivarReferenceImage: CultivarReferenceImageView | null;
};

const cultivarReferenceImageAssetSelect = {
  ...imageAssetUrlSelect,
  cultivarReferenceId: true,
} as const;

type CultivarReferenceImageAssetRow = Prisma.ImageAssetGetPayload<{
  select: typeof cultivarReferenceImageAssetSelect;
}>;

const CULTIVAR_REFERENCE_IMAGE_ASSET_QUERY_CHUNK_SIZE = 400;

type V2CultivarReferenceRow = Prisma.CultivarReferenceGetPayload<{
  select: typeof v2CultivarReferenceSelect;
}>;

type RawCultivarReferenceBaseRow = {
  id: string;
  normalizedName: string | null;
  updatedAt: Date | string | number;
};

type RawV2CultivarReferenceRow = RawCultivarReferenceBaseRow & {
  v2_id: string | null;
  v2_post_title: string | null;
  v2_introduction_date: string | null;
  v2_primary_hybridizer_name: string | null;
  v2_hybridizer_code_legacy: string | null;
  v2_additional_hybridizers_names: string | null;
  v2_bloom_season_names: string | null;
  v2_fragrance_names: string | null;
  v2_bloom_habit_names: string | null;
  v2_foliage_names: string | null;
  v2_ploidy_names: string | null;
  v2_scape_height_in: number | null;
  v2_bloom_size_in: number | null;
  v2_bud_count: number | null;
  v2_branches: number | null;
  v2_color: string | null;
  v2_flower_form_names: string | null;
  v2_unusual_forms_names: string | null;
  v2_parentage: string | null;
  v2_image_url: string | null;
};

function toDate(value: Date | string | number) {
  return value instanceof Date ? value : new Date(value);
}

function chunkArray<T>(values: readonly T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function mapV2CultivarReferenceRow(
  row: V2CultivarReferenceRow,
): Omit<DashboardCultivarReference, "cultivarReferenceImage"> {
  return {
    id: row.id,
    normalizedName: row.normalizedName,
    updatedAt: row.updatedAt,
    ahsListing: row.v2AhsCultivar
      ? mapV2AhsCultivarToDisplayAhsListing(row.v2AhsCultivar)
      : null,
  };
}

function mapRawV2CultivarReferenceRow(
  row: RawV2CultivarReferenceRow,
): Omit<DashboardCultivarReference, "cultivarReferenceImage"> {
  const v2AhsCultivar: V2AhsCultivarDisplaySource | null = row.v2_id
    ? {
        id: row.v2_id,
        post_title: row.v2_post_title,
        introduction_date: row.v2_introduction_date,
        primary_hybridizer_name: row.v2_primary_hybridizer_name,
        hybridizer_code_legacy: row.v2_hybridizer_code_legacy,
        additional_hybridizers_names: row.v2_additional_hybridizers_names,
        bloom_season_names: row.v2_bloom_season_names,
        fragrance_names: row.v2_fragrance_names,
        bloom_habit_names: row.v2_bloom_habit_names,
        foliage_names: row.v2_foliage_names,
        ploidy_names: row.v2_ploidy_names,
        scape_height_in: row.v2_scape_height_in,
        bloom_size_in: row.v2_bloom_size_in,
        bud_count: row.v2_bud_count,
        branches: row.v2_branches,
        color: row.v2_color,
        flower_form_names: row.v2_flower_form_names,
        unusual_forms_names: row.v2_unusual_forms_names,
        parentage: row.v2_parentage,
        image_url: row.v2_image_url,
      }
    : null;

  return {
    id: row.id,
    normalizedName: row.normalizedName,
    updatedAt: toDate(row.updatedAt),
    ahsListing: v2AhsCultivar
      ? mapV2AhsCultivarToDisplayAhsListing(v2AhsCultivar)
      : null,
  };
}

async function getCultivarReferencesByIdsRaw(
  db: PrismaClient,
  ids: string[],
): Promise<DashboardCultivarReference[]> {
  if (!ids.length) return [];

  const rows = await db.$queryRaw<RawV2CultivarReferenceRow[]>(Prisma.sql`
    SELECT
      cr."id",
      cr."normalizedName",
      cr."updatedAt",
      v2."id" AS "v2_id",
      v2."post_title" AS "v2_post_title",
      v2."introduction_date" AS "v2_introduction_date",
      v2."primary_hybridizer_name" AS "v2_primary_hybridizer_name",
      v2."hybridizer_code_legacy" AS "v2_hybridizer_code_legacy",
      v2."additional_hybridizers_names" AS "v2_additional_hybridizers_names",
      v2."bloom_season_names" AS "v2_bloom_season_names",
      v2."fragrance_names" AS "v2_fragrance_names",
      v2."bloom_habit_names" AS "v2_bloom_habit_names",
      v2."foliage_names" AS "v2_foliage_names",
      v2."ploidy_names" AS "v2_ploidy_names",
      v2."scape_height_in" AS "v2_scape_height_in",
      v2."bloom_size_in" AS "v2_bloom_size_in",
      v2."bud_count" AS "v2_bud_count",
      v2."branches" AS "v2_branches",
      v2."color" AS "v2_color",
      v2."flower_form_names" AS "v2_flower_form_names",
      v2."unusual_forms_names" AS "v2_unusual_forms_names",
      v2."parentage" AS "v2_parentage",
      v2."image_url" AS "v2_image_url"
    FROM "CultivarReference" cr
    LEFT JOIN "V2AhsCultivar" v2 ON v2."id" = cr."v2AhsCultivarId"
    WHERE cr."id" IN (${Prisma.join(ids)})
    ORDER BY cr."id"
  `);

  return addCultivarReferenceImages(
    db,
    rows.map(mapRawV2CultivarReferenceRow),
  );
}

async function getCultivarReferenceImageAssets(
  db: PrismaClient,
  cultivarReferenceIds: string[],
) {
  const map = new Map<string, CultivarReferenceImageAssetRow>();

  if (
    !shouldQueryGeneratedCultivarImageAssets() ||
    cultivarReferenceIds.length === 0
  ) {
    return map;
  }

  const chunks = chunkArray(
    Array.from(new Set(cultivarReferenceIds)),
    CULTIVAR_REFERENCE_IMAGE_ASSET_QUERY_CHUNK_SIZE,
  );

  for (const chunk of chunks) {
    const rows = await db.imageAsset.findMany({
      where: {
        kind: "cultivar",
        status: "ready",
        cultivarReferenceId: { in: chunk },
      },
      select: cultivarReferenceImageAssetSelect,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    for (const row of rows) {
      if (row.cultivarReferenceId && !map.has(row.cultivarReferenceId)) {
        map.set(row.cultivarReferenceId, row);
      }
    }
  }

  return map;
}

async function addCultivarReferenceImages(
  db: PrismaClient,
  rows: Array<Omit<DashboardCultivarReference, "cultivarReferenceImage">>,
): Promise<DashboardCultivarReference[]> {
  const imageAssetsByCultivarReferenceId = await getCultivarReferenceImageAssets(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => {
    const imageAsset = imageAssetsByCultivarReferenceId.get(row.id);

    return {
      ...row,
      cultivarReferenceImage: resolveCultivarReferenceImage({
        id: `ahs-${row.id}`,
        fallbackImageUrl: row.ahsListing?.ahsImageUrl,
        imageAssets: imageAsset ? [imageAsset] : [],
      }),
    };
  });
}

async function getCultivarReferencesForUserListings(
  userId: string,
  db: PrismaClient,
  options: {
    since?: Date;
    direction: "asc" | "desc";
    cursor?: {
      id: string;
    };
    limit?: number;
  },
) {
  const orderDirection =
    options.direction === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const ownerWhere = Prisma.sql`
    cr."id" IN (
      SELECT l."cultivarReferenceId"
      FROM "Listing" l
      WHERE l."userId" = ${userId}
        AND l."cultivarReferenceId" IS NOT NULL
    )
  `;
  const cursorWhere = options.cursor
    ? Prisma.sql`AND cr."id" > ${options.cursor.id}`
    : Prisma.empty;
  const sinceWhere = options.since
    ? Prisma.sql`AND cr."updatedAt" >= ${options.since}`
    : Prisma.empty;
  const limitClause = options.limit
    ? Prisma.sql`LIMIT ${options.limit}`
    : Prisma.empty;

  const rows = await db.$queryRaw<RawV2CultivarReferenceRow[]>(Prisma.sql`
    SELECT
      cr."id",
      cr."normalizedName",
      cr."updatedAt",
      v2."id" AS "v2_id",
      v2."post_title" AS "v2_post_title",
      v2."introduction_date" AS "v2_introduction_date",
      v2."primary_hybridizer_name" AS "v2_primary_hybridizer_name",
      v2."hybridizer_code_legacy" AS "v2_hybridizer_code_legacy",
      v2."additional_hybridizers_names" AS "v2_additional_hybridizers_names",
      v2."bloom_season_names" AS "v2_bloom_season_names",
      v2."fragrance_names" AS "v2_fragrance_names",
      v2."bloom_habit_names" AS "v2_bloom_habit_names",
      v2."foliage_names" AS "v2_foliage_names",
      v2."ploidy_names" AS "v2_ploidy_names",
      v2."scape_height_in" AS "v2_scape_height_in",
      v2."bloom_size_in" AS "v2_bloom_size_in",
      v2."bud_count" AS "v2_bud_count",
      v2."branches" AS "v2_branches",
      v2."color" AS "v2_color",
      v2."flower_form_names" AS "v2_flower_form_names",
      v2."unusual_forms_names" AS "v2_unusual_forms_names",
      v2."parentage" AS "v2_parentage",
      v2."image_url" AS "v2_image_url"
    FROM "CultivarReference" cr
    LEFT JOIN "V2AhsCultivar" v2 ON v2."id" = cr."v2AhsCultivarId"
    WHERE ${ownerWhere}
      ${sinceWhere}
      ${cursorWhere}
    ORDER BY cr."id" ${orderDirection}
    ${limitClause}
  `);

  return addCultivarReferenceImages(
    db,
    rows.map(mapRawV2CultivarReferenceRow),
  );
}

export const dashboardDbCultivarReferenceRouter = createTRPCRouter({
  listForUserListings: protectedProcedure.query(async ({ ctx }) => {
    const rows = await getCultivarReferencesForUserListings(
      ctx.user.id,
      ctx.db,
      { direction: "desc" },
    );

    return rows;
  }),

  sync: protectedProcedure
    .input(dashboardSyncInputSchema)
    .query(async ({ ctx, input }) => {
      const since = parseDashboardSyncSince(input.since);
      const rows = await getCultivarReferencesForUserListings(
        ctx.user.id,
        ctx.db,
        {
          since,
          direction: "asc",
          cursor: input.cursor
            ? {
                id: input.cursor.id,
              }
            : undefined,
          limit: input.limit,
        },
      );

      return rows;
    }),

  getByIds: protectedProcedure
    .input(z.object({ ids: z.array(z.string().trim().min(1)).min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const unique = Array.from(new Set(input.ids));
      const rows = await ctx.db.cultivarReference.findMany({
        where: { id: { in: unique } },
        select: v2CultivarReferenceSelect,
      });

      return addCultivarReferenceImages(
        ctx.db,
        rows.map(mapV2CultivarReferenceRow),
      );
    }),

  getByIdsBatch: protectedProcedure
    .input(z.object({ ids: z.array(z.string().trim().min(1)).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const unique = Array.from(new Set(input.ids));
      const rows = await getCultivarReferencesByIdsRaw(ctx.db, unique);

      return rows;
    }),

  getByIdsBatchReplica: protectedProcedure
    .input(z.object({ ids: z.array(z.string().trim().min(1)).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const unique = Array.from(new Set(input.ids));
      const rows = await getCultivarReferencesByIdsRaw(
        ctx.replicaDb ?? ctx.db,
        unique,
      );

      return rows;
    }),
});
