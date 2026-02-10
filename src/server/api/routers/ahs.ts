import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { unstableCacheUnlessE2E } from "@/lib/next-cache-utils";
import { compareItems, rankings, rankItem } from "@tanstack/match-sorter-utils";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import {
  normalizeCultivarName,
  toSentenceCaseCultivarName,
} from "@/lib/utils/cultivar-utils";

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
    include: {
      ahsListing: {
        select: {
          id: true,
        },
      },
    },
  });

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
    if (!row.ahsListing?.id) {
      return [];
    }

    return [
      {
        id: row.ahsListing.id,
        name: toSentenceCaseCultivarName(row.normalizedName),
        cultivarReferenceId: row.id,
      },
    ];
  });
}

// Baseline-cutover cleanup:
// Remove this function and all callers once the feature flag defaults to ON
// and legacy AHS search behavior is no longer needed.
async function runLegacyAhsSearchQuery(db: PrismaClient, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const results = await db.ahsListing.findMany({
    where: {
      name: {
        startsWith: trimmedQuery,
      },
    },
    take: 25,
    orderBy: {
      name: "asc",
    },
    include: {
      cultivarReference: {
        select: {
          id: true,
        },
      },
    },
  });

  const sorted = results.sort((a, b) => {
    const aRank = rankItem(a.name ?? "", trimmedQuery, {
      threshold: rankings.WORD_STARTS_WITH,
    });
    const bRank = rankItem(b.name ?? "", trimmedQuery, {
      threshold: rankings.WORD_STARTS_WITH,
    });

    if (aRank.passed && !bRank.passed) return -1;
    if (!aRank.passed && bRank.passed) return 1;

    return compareItems(aRank, bRank);
  });

  return sorted.map((row) => ({
    id: row.id,
    name: row.name,
    cultivarReferenceId: row.cultivarReference?.id ?? null,
  }));
}

export const ahsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        // Temporary rollout switch to keep legacy behavior when flag is OFF.
        // Remove after baseline cutover.
        useCultivarReferenceSearch: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const getAhsSearchResults = unstableCacheUnlessE2E(
        async () =>
          input.useCultivarReferenceSearch
            ? runCultivarReferenceSearchQuery(ctx.db, input.query)
            : runLegacyAhsSearchQuery(ctx.db, input.query),
        [
          `ahs-search-${input.query.toLowerCase()}-${input.useCultivarReferenceSearch ? "cultivar" : "legacy"}`,
        ],
        {
          // Cache for 3 days since data hardly changes
          revalidate: 60 * 60 * 24 * 3,
        },
      );

      return getAhsSearchResults();
    }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        // Temporary rollout switch to keep legacy behavior when flag is OFF.
        // Remove after baseline cutover.
        useCultivarReferenceLookup: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!input.useCultivarReferenceLookup) {
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
      }

      const cultivarReference = await ctx.db.cultivarReference.findUnique({
        where: { ahsId: input.id },
        select: {
          normalizedName: true,
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

      return {
        ...ahsListing,
        name:
          ahsListing.name ??
          toSentenceCaseCultivarName(cultivarReference.normalizedName),
      };
    }),
});

export type AhsRouter = typeof ahsRouter;
