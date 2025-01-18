import { z } from "zod";

export const dashboardStatsSchema = z.object({
  totalListings: z.number(),
  totalLists: z.number(),
  profileViews: z.number(),
  totalSales: z.number(),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
