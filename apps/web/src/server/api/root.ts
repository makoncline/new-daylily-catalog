import { createTRPCRouter, createCallerFactory } from "@/server/api/trpc";
import { stripeRouter } from "@/server/api/routers/stripe";
import { userRouter } from "@/server/api/routers/user";
import { publicRouter } from "./routers/public";
import { dashboardDbRouter } from "./routers/dashboard-db";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  stripe: stripeRouter,
  user: userRouter,
  public: publicRouter,
  dashboardDb: dashboardDbRouter,
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
