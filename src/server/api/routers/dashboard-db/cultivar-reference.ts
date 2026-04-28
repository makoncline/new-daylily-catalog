import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { PrismaClient } from "@prisma/client";
import {
  ahsDisplayAhsListingSelect,
  mapV2AhsCultivarToDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import type {
  AhsDisplayListing,
  V2AhsCultivarDisplaySource,
} from "@/lib/utils/ahs-display";
import { isV2CultivarDisplayDataEnabled } from "@/config/feature-flags";
import {
  dashboardSyncInputSchema,
  parseDashboardSyncSince,
} from "./dashboard-db-router-helpers";

const legacyCultivarReferenceSelect = {
  id: true,
  normalizedName: true,
  updatedAt: true,
  ahsListing: {
    select: ahsDisplayAhsListingSelect,
  },
} as const;

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
};

type LegacyCultivarReferenceRow = Prisma.CultivarReferenceGetPayload<{
  select: typeof legacyCultivarReferenceSelect;
}>;

type V2CultivarReferenceRow = Prisma.CultivarReferenceGetPayload<{
  select: typeof v2CultivarReferenceSelect;
}>;

type RawCultivarReferenceBaseRow = {
  id: string;
  normalizedName: string | null;
  updatedAt: Date | string | number;
};

type RawLegacyCultivarReferenceRow = RawCultivarReferenceBaseRow & {
  ahs_id: string | null;
  ahs_name: string | null;
  ahs_ahsImageUrl: string | null;
  ahs_hybridizer: string | null;
  ahs_year: string | null;
  ahs_scapeHeight: string | null;
  ahs_bloomSize: string | null;
  ahs_bloomSeason: string | null;
  ahs_ploidy: string | null;
  ahs_foliageType: string | null;
  ahs_bloomHabit: string | null;
  ahs_color: string | null;
  ahs_form: string | null;
  ahs_parentage: string | null;
  ahs_fragrance: string | null;
  ahs_budcount: string | null;
  ahs_branches: string | null;
  ahs_sculpting: string | null;
  ahs_foliage: string | null;
  ahs_flower: string | null;
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

function mapLegacyCultivarReferenceRow(
  row: LegacyCultivarReferenceRow,
): DashboardCultivarReference {
  return {
    id: row.id,
    normalizedName: row.normalizedName,
    updatedAt: row.updatedAt,
    ahsListing: row.ahsListing ?? null,
  };
}

function mapV2CultivarReferenceRow(
  row: V2CultivarReferenceRow,
): DashboardCultivarReference {
  return {
    id: row.id,
    normalizedName: row.normalizedName,
    updatedAt: row.updatedAt,
    ahsListing: row.v2AhsCultivar
      ? mapV2AhsCultivarToDisplayAhsListing(row.v2AhsCultivar)
      : null,
  };
}

function mapRawLegacyCultivarReferenceRow(
  row: RawLegacyCultivarReferenceRow,
): DashboardCultivarReference {
  const ahsListing = row.ahs_id
    ? {
        id: row.ahs_id,
        name: row.ahs_name,
        ahsImageUrl: row.ahs_ahsImageUrl,
        hybridizer: row.ahs_hybridizer,
        year: row.ahs_year,
        scapeHeight: row.ahs_scapeHeight,
        bloomSize: row.ahs_bloomSize,
        bloomSeason: row.ahs_bloomSeason,
        ploidy: row.ahs_ploidy,
        foliageType: row.ahs_foliageType,
        bloomHabit: row.ahs_bloomHabit,
        color: row.ahs_color,
        form: row.ahs_form,
        parentage: row.ahs_parentage,
        fragrance: row.ahs_fragrance,
        budcount: row.ahs_budcount,
        branches: row.ahs_branches,
        sculpting: row.ahs_sculpting,
        foliage: row.ahs_foliage,
        flower: row.ahs_flower,
      }
    : null;

  return {
    id: row.id,
    normalizedName: row.normalizedName,
    updatedAt: toDate(row.updatedAt),
    ahsListing,
  };
}

function mapRawV2CultivarReferenceRow(
  row: RawV2CultivarReferenceRow,
): DashboardCultivarReference {
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

  if (isV2CultivarDisplayDataEnabled()) {
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

    return rows.map(mapRawV2CultivarReferenceRow);
  }

  const rows = await db.$queryRaw<RawLegacyCultivarReferenceRow[]>(Prisma.sql`
    SELECT
      cr."id",
      cr."normalizedName",
      cr."updatedAt",
      ahs."id" AS "ahs_id",
      ahs."name" AS "ahs_name",
      ahs."ahsImageUrl" AS "ahs_ahsImageUrl",
      ahs."hybridizer" AS "ahs_hybridizer",
      ahs."year" AS "ahs_year",
      ahs."scapeHeight" AS "ahs_scapeHeight",
      ahs."bloomSize" AS "ahs_bloomSize",
      ahs."bloomSeason" AS "ahs_bloomSeason",
      ahs."ploidy" AS "ahs_ploidy",
      ahs."foliageType" AS "ahs_foliageType",
      ahs."bloomHabit" AS "ahs_bloomHabit",
      ahs."color" AS "ahs_color",
      ahs."form" AS "ahs_form",
      ahs."parentage" AS "ahs_parentage",
      ahs."fragrance" AS "ahs_fragrance",
      ahs."budcount" AS "ahs_budcount",
      ahs."branches" AS "ahs_branches",
      ahs."sculpting" AS "ahs_sculpting",
      ahs."foliage" AS "ahs_foliage",
      ahs."flower" AS "ahs_flower"
    FROM "CultivarReference" cr
    LEFT JOIN "AhsListing" ahs ON ahs."id" = cr."ahsId"
    WHERE cr."id" IN (${Prisma.join(ids)})
    ORDER BY cr."id"
  `);

  return rows.map(mapRawLegacyCultivarReferenceRow);
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
  const listingRows = await db.listing.findMany({
    where: {
      userId,
      cultivarReferenceId: {
        not: null,
      },
    },
    select: {
      cultivarReferenceId: true,
    },
  });

  const cultivarReferenceIds = Array.from(
    new Set(
      listingRows.flatMap((row) =>
        row.cultivarReferenceId ? [row.cultivarReferenceId] : [],
      ),
    ),
  );

  if (!cultivarReferenceIds.length) {
    return [];
  }

  const where = {
    id: {
      in: cultivarReferenceIds,
      ...(options.cursor ? { gt: options.cursor.id } : {}),
    },
    ...(options.since ? { updatedAt: { gte: options.since } } : {}),
  };

  if (isV2CultivarDisplayDataEnabled()) {
    const rows = await db.cultivarReference.findMany({
      where,
      select: v2CultivarReferenceSelect,
      orderBy: { id: options.direction },
      ...(options.limit ? { take: options.limit } : {}),
    });

    return rows.map(mapV2CultivarReferenceRow);
  }

  const rows = await db.cultivarReference.findMany({
    where,
    select: legacyCultivarReferenceSelect,
    orderBy: { id: options.direction },
    ...(options.limit ? { take: options.limit } : {}),
  });

  return rows.map(mapLegacyCultivarReferenceRow);
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
      if (isV2CultivarDisplayDataEnabled()) {
        const rows = await ctx.db.cultivarReference.findMany({
          where: { id: { in: unique } },
          select: v2CultivarReferenceSelect,
        });

        return rows.map(mapV2CultivarReferenceRow);
      }

      const rows = await ctx.db.cultivarReference.findMany({
        where: { id: { in: unique } },
        select: legacyCultivarReferenceSelect,
      });

      return rows.map(mapLegacyCultivarReferenceRow);
    }),

  getByIdsBatch: protectedProcedure
    .input(z.object({ ids: z.array(z.string().trim().min(1)).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const unique = Array.from(new Set(input.ids));
      const rows = await getCultivarReferencesByIdsRaw(ctx.db, unique);

      return rows;
    }),
});
