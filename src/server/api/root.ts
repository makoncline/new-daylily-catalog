import { createTRPCRouter, createCallerFactory } from "@/server/api/trpc";
import { stripeRouter } from "@/server/api/routers/stripe";
import { imageRouter } from "./routers/image";
import { listingRouter } from "./routers/listing";
import { ahsRouter } from "./routers/ahs";
import { userRouter } from "@/server/api/routers/user";
import { listRouter } from "./routers/list";
import { userProfileRouter } from "@/server/api/routers/user-profile";
import { dashboardRouter } from "./routers/dashboard";
import { publicRouter } from "./routers/public";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  stripe: stripeRouter,
  image: imageRouter,
  listing: listingRouter,
  ahs: ahsRouter,
  user: userRouter,
  list: listRouter,
  userProfile: userProfileRouter,
  dashboard: dashboardRouter,
  public: publicRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
