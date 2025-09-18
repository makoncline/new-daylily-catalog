import { createTRPCRouter } from "@/server/api/trpc";
import { type RouterOutputs } from "@/trpc/react";
import { listingsProcedures } from "./listings-procedures";
import { listsProcedures } from "./lists-procedures";
import { ahsProcedures } from "./ahs-procedures";

export const dashboardTwoRouter = createTRPCRouter({
  ...listingsProcedures,
  ...listsProcedures,
  ...ahsProcedures,
});

export type DashbordTwoRouterOutputs = RouterOutputs["dashboardTwo"];
