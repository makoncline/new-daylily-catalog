import { createTRPCRouter } from "@/server/api/trpc";
import { dashboardDbAhsRouter } from "./ahs";
import { dashboardDbCultivarReferenceRouter } from "./cultivar-reference";
import { dashboardDbDashboardRouter } from "./dashboard";
import { dashboardDbImageRouter } from "./image";
import { dashboardDbListRouter } from "./list";
import { dashboardDbListingRouter } from "./listing";
import { dashboardDbUserRouter } from "./user";
import { dashboardDbUserProfileRouter } from "./user-profile";

export const dashboardDbRouter = createTRPCRouter({
  dashboard: dashboardDbDashboardRouter,
  listing: dashboardDbListingRouter,
  list: dashboardDbListRouter,
  image: dashboardDbImageRouter,
  ahs: dashboardDbAhsRouter,
  cultivarReference: dashboardDbCultivarReferenceRouter,
  user: dashboardDbUserRouter,
  userProfile: dashboardDbUserProfileRouter,
});
