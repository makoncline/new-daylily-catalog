import { createTRPCRouter } from "@/server/api/trpc";
import { type RouterOutputs } from "@/trpc/react";
import { listingsProcedures } from "./listings-procedures";
import { listsProcedures } from "./lists-procedures";
import { ahsProcedures } from "./ahs-procedures";
import { imagesProcedures } from "./images-procedures";

export const dashboardTwoRouter = createTRPCRouter({
  ...listingsProcedures,
  ...listsProcedures,
  ...ahsProcedures,
  ...imagesProcedures,
});

export type DashbordTwoRouterOutputs = RouterOutputs["dashboardTwo"];
