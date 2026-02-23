import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { compareItems, rankings, rankItem } from "@tanstack/match-sorter-utils";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import { reportError } from "@/lib/error-utils";

async function runCultivarReferenceSearchQuery(db: PrismaClient, query: string) {
  const normalizedQuery = normalizeCultivarName(query);
  if (!normalizedQuery) {
    return [];
  }

  const results = await db.cultivarReference.findMany({
    where: {
      ahsId: {
        not: null,
      },
      normalizedName: {
        startsWith: normalizedQuery,
      },
    },
    take: 25,
    orderBy: {
      normalizedName: "asc",
    },
    select: {
      id: true,
      ahsId: true,
      normalizedName: true,
      ahsListing: {
        select: {
          name: true,
        },
      },
    },
  });

  // Centralize how search labels are resolved so future external reference
  // sources only need one change here.
  const getCultivarReferenceSearchDisplayName = (
    row: (typeof results)[number],
  ): string | null => {
    if (row.ahsListing?.name) {
      return row.ahsListing.name;
    }

    if (row.normalizedName) {
      reportError({
        error: new Error(
          "AHS display name missing for cultivar reference search result; falling back to normalized name",
        ),
        level: "warning",
        context: {
          source: "ahsRouter.search",
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
        source: "ahsRouter.search",
        cultivarReferenceId: row.id,
        ahsId: row.ahsId,
      },
    });

    return null;
  };

  // Sort the results based on the ranking of how closely they match the input.
  const sorted = results.sort((a, b) => {
    const aRank = rankItem(a.normalizedName ?? "", normalizedQuery, {
      threshold: rankings.WORD_STARTS_WITH,
    });
    const bRank = rankItem(b.normalizedName ?? "", normalizedQuery, {
      threshold: rankings.WORD_STARTS_WITH,
    });

    // Prioritize items that pass the match criteria.
    if (aRank.passed && !bRank.passed) return -1;
    if (!aRank.passed && bRank.passed) return 1;

    // Otherwise, sort by rank (lower rank indicate a closer match).
    return compareItems(aRank, bRank);
  });

  return sorted.flatMap((row) => {
    if (!row.ahsId) {
      return [];
    }

    return [
      {
        id: row.ahsId,
        name: getCultivarReferenceSearchDisplayName(row),
        cultivarReferenceId: row.id,
      },
    ];
  });
}

export const ahsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) =>
      runCultivarReferenceSearchQuery(ctx.db, input.query),
    ),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
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

export type AhsRouter = typeof ahsRouter;
