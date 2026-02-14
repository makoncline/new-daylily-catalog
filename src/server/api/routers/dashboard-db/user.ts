import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const dashboardDbUserRouter = createTRPCRouter({
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
});

