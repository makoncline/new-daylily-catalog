import { createTRPCRouter } from "@/server/api/trpc";
import { type RouterOutputs } from "@/trpc/react";
import { listingsProcedures } from "./listings-procedures";
import { listsProcedures } from "./lists-procedures";

export const dashboardTwoRouter = createTRPCRouter({
  ...listingsProcedures,
  ...listsProcedures,
});

export type DashbordTwoRouterOutputs = RouterOutputs["dashboardTwo"];
