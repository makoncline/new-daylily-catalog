import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { compareItems, rankings, rankItem } from "@tanstack/match-sorter-utils";
import { TRPCError } from "@trpc/server";
import { unstable_cache } from "next/cache";
import type { PrismaClient } from "@prisma/client";

async function runAhsSearchQuery(db: PrismaClient, query: string) {
  const results = await db.ahsListing.findMany({
    where: {
      name: {
        startsWith: query,
      },
    },
    take: 25,
    orderBy: {
      name: "asc",
    },
  });

  // Sort the results based on the ranking of how closely they match the input.
  return results.sort((a, b) => {
    const aRank = rankItem(a.name, query, {
      threshold: rankings.WORD_STARTS_WITH,
    });
    const bRank = rankItem(b.name, query, {
      threshold: rankings.WORD_STARTS_WITH,
    });

    // Prioritize items that pass the match criteria.
    if (aRank.passed && !bRank.passed) return -1;
    if (!aRank.passed && bRank.passed) return 1;

    // Otherwise, sort by rank (lower rank indicate a closer match).
    return compareItems(aRank, bRank);
  });
}

export const ahsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const isPlaywrightLocalRun = process.env.PLAYWRIGHT_LOCAL_E2E === "true";
      const shouldCacheSearch =
        process.env.NODE_ENV === "production" && !isPlaywrightLocalRun;

      if (!shouldCacheSearch) {
        return runAhsSearchQuery(ctx.db, input.query);
      }

      return await unstable_cache(
        async () => runAhsSearchQuery(ctx.db, input.query),
        [`ahs-search-${input.query.toLowerCase()}`],
        {
          // Cache for 3 days since data hardly changes
          revalidate: 60 * 60 * 24 * 3,
        },
      )();
    }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const ahsListing = await ctx.db.ahsListing.findUnique({
        where: { id: input.id },
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
      });

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
