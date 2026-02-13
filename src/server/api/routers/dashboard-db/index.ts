import { createTRPCRouter } from "@/server/api/trpc";
import { dashboardDbAhsRouter } from "./ahs";
import { dashboardDbImageRouter } from "./image";
import { dashboardDbListRouter } from "./list";
import { dashboardDbListingRouter } from "./listing";

export const dashboardDbRouter = createTRPCRouter({
  listing: dashboardDbListingRouter,
  list: dashboardDbListRouter,
  image: dashboardDbImageRouter,
  ahs: dashboardDbAhsRouter,
});

