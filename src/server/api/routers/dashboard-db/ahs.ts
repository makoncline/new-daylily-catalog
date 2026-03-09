import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { searchPublicCultivars } from "@/server/db/searchPublicCultivars";

export const dashboardDbAhsRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) =>
      searchPublicCultivars(ctx.db, input.query, { take: 25 }),
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
