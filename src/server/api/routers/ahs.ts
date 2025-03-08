import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { compareItems, rankings, rankItem } from "@tanstack/match-sorter-utils";

export const ahsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.ahsListing.findMany({
        where: {
          name: {
            startsWith: input.query,
          },
        },
        take: 50,
        orderBy: {
          name: "asc",
        },
      });
      // Sort the results based on the ranking of how closely they match the input.
      const sortedResults = results.sort((a, b) => {
        const aRank = rankItem(a.name, input.query, {
          threshold: rankings.WORD_STARTS_WITH,
        });
        const bRank = rankItem(b.name, input.query, {
          threshold: rankings.WORD_STARTS_WITH,
        });

        // Prioritize items that pass the match criteria.
        if (aRank.passed && !bRank.passed) return -1;
        if (!aRank.passed && bRank.passed) return 1;

        // Otherwise, sort by rank (lower rank indicate a closer match).
        return compareItems(aRank, bRank);
      });

      return sortedResults;
    }),
});

export type AhsRouter = typeof ahsRouter;
