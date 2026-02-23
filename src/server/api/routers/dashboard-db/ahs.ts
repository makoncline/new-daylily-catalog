import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { compareItems, rankings, rankItem } from "@tanstack/match-sorter-utils";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import { reportError } from "@/lib/error-utils";
import type { PrismaClient } from "@prisma/client";

async function runCultivarReferenceSearchQuery(db: PrismaClient, query: string) {
  const normalizedQuery = normalizeCultivarName(query);
  if (!normalizedQuery) return [];

  const results = await db.cultivarReference.findMany({
    where: {
      ahsId: { not: null },
      normalizedName: { startsWith: normalizedQuery },
    },
    take: 25,
    orderBy: { normalizedName: "asc" },
    select: {
      id: true,
      ahsId: true,
      normalizedName: true,
      ahsListing: { select: { name: true } },
    },
  });

  const getDisplayName = (row: (typeof results)[number]): string | null => {
    if (row.ahsListing?.name) return row.ahsListing.name;
    if (row.normalizedName) {
      reportError({
        error: new Error(
          "AHS display name missing for cultivar reference search result; falling back to normalized name",
        ),
        level: "warning",
        context: {
          source: "dashboardDb.ahs.search",
          cultivarReferenceId: row.id,
          ahsId: row.ahsId,
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
        ahsId: row.ahsId,
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
    if (!row.ahsId) return [];
    return [
      {
        id: row.ahsId,
        name: getDisplayName(row),
        cultivarReferenceId: row.id,
      },
    ];
  });
}

export const dashboardDbAhsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) =>
      runCultivarReferenceSearchQuery(ctx.db, input.query),
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const cultivarReference = await ctx.db.cultivarReference.findUnique({
        where: { ahsId: input.id },
        select: {
          ahsListing: {
            select: {
              id: true,
              name: true,
              ahsImageUrl: true,
              hybridizer: true,
              year: true,
              scapeHeight: true,
              bloomSize: true,
              bloomSeason: true,
              form: true,
              ploidy: true,
              foliageType: true,
              bloomHabit: true,
              budcount: true,
              branches: true,
              sculpting: true,
              foliage: true,
              flower: true,
              fragrance: true,
              parentage: true,
              color: true,
            },
          },
        },
      });

      const ahsListing = cultivarReference?.ahsListing;
      if (!ahsListing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AHS listing not found",
        });
      }

      return ahsListing;
    }),
});
