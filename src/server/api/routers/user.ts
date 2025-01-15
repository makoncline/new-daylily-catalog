import { publicProcedure } from "@/server/api/trpc";
import { createTRPCRouter } from "@/server/api/trpc";
import { type inferRouterOutputs } from "@trpc/server";

export const userRouter = createTRPCRouter({
  getCurrentUser: publicProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
});

export type UserRouter = typeof userRouter;
export type UserRouterOutput = inferRouterOutputs<UserRouter>;
export type GetCurrentUserOutput = UserRouterOutput["getCurrentUser"];
