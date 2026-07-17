import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { compareItems, rankings, rankItem } from "@tanstack/match-sorter-utils";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import { reportError } from "@/lib/error-utils";
import type { PrismaClient } from "@prisma/client";
import {
  getDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import {
  generatedCultivarImageAssetInclude,
  resolveCultivarReferenceImage,
} from "@/server/services/cultivar-reference-image-read-model";

async function runCultivarReferenceSearchQuery(
  db: PrismaClient,
  query: string,
) {
  const normalizedQuery = normalizeCultivarName(query);
  if (!normalizedQuery) return [];

  const results = await db.cultivarReference.findMany({
    where: {
      v2AhsCultivar: { isNot: null },
      normalizedName: { startsWith: normalizedQuery },
    },
    take: 25,
    orderBy: { normalizedName: "asc" },
    select: {
      id: true,
      normalizedName: true,
      v2AhsCultivar: {
        select: v2AhsCultivarDisplaySelect,
      },
    },
  });

  const getDisplayName = (row: (typeof results)[number]): string | null => {
    const displayAhsListing = getDisplayAhsListing(row);

    if (displayAhsListing?.name) return displayAhsListing.name;
    if (row.normalizedName) {
      reportError({
        error: new Error(
          "AHS display name missing for cultivar reference search result; falling back to normalized name",
        ),
        level: "warning",
        context: {
          source: "dashboardDb.ahs.search",
          cultivarReferenceId: row.id,
          normalizedName: row.normalizedName,
        },
      });
      return row.normalizedName;
    }
    reportError({
      error: new Error(
        "AHS display name and normalized name are both missing for cultivar reference search result",
      ),
      context: {
        source: "dashboardDb.ahs.search",
        cultivarReferenceId: row.id,
      },
    });
    return null;
  };

  const sorted = results.sort((a, b) => {
    const aRank = rankItem(a.normalizedName ?? "", normalizedQuery, {
      threshold: rankings.WORD_STARTS_WITH,
    });
    const bRank = rankItem(b.normalizedName ?? "", normalizedQuery, {
      threshold: rankings.WORD_STARTS_WITH,
    });

    if (aRank.passed && !bRank.passed) return -1;
    if (!aRank.passed && bRank.passed) return 1;
    return compareItems(aRank, bRank);
  });

  return sorted.flatMap((row) => {
    const name = getDisplayName(row);
    if (!name) return [];

    return [
      {
        id: row.id,
        name,
        cultivarReferenceId: row.id,
      },
    ];
  });
}

export const dashboardDbAhsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) =>
      runCultivarReferenceSearchQuery(ctx.replicaDb ?? ctx.db, input.query),
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const readDb = ctx.replicaDb ?? ctx.db;
      const cultivarReference = await readDb.cultivarReference.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          v2AhsCultivar: {
            select: v2AhsCultivarDisplaySelect,
          },
          imageAssets: generatedCultivarImageAssetInclude,
        },
      });

      const ahsListing = cultivarReference
        ? getDisplayAhsListing(cultivarReference)
        : null;
      if (!cultivarReference || !ahsListing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AHS listing not found",
        });
      }

      return {
        ...ahsListing,
        cultivarReferenceImage: resolveCultivarReferenceImage({
          id: `ahs-${cultivarReference.id}`,
          fallbackImageUrl: ahsListing.ahsImageUrl,
          imageAssets: cultivarReference.imageAssets,
        }),
      };
    }),
});
