import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { dashboardStatsSchema } from "@/types/schemas/dashboard";

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure
    .output(dashboardStatsSchema)
    .query(async ({ ctx }) => {
      const [totalListings, totalLists] = await Promise.all([
        ctx.db.listing.count({
          where: { userId: ctx.user.id },
        }),
        ctx.db.list.count({
          where: { userId: ctx.user.id },
        }),
      ]);

      // For now, return mock data for profile views and sales
      // TODO: Implement actual tracking and sales data
      return {
        totalListings,
        totalLists,
        profileViews: 0,
        totalSales: 0,
      };
    }),
});
