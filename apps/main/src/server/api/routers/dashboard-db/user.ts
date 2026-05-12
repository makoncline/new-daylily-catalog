import { TRPCError } from "@trpc/server";
import { auth } from "@clerk/nextjs/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import type { TRPCInternalContext } from "@/server/api/trpc";

export const dashboardDbUserRouter = createTRPCRouter({
  getCurrentUserId: publicProcedure.query(async ({ ctx }) => {
    const contextUser = (ctx as TRPCInternalContext)._authUser;

    if (contextUser) {
      return { id: contextUser.id };
    }

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const existingUser = await ctx.db.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (existingUser) {
      return existingUser;
    }

    const user = await ctx.db.user.upsert({
      where: { clerkUserId },
      update: {},
      create: { clerkUserId },
      select: { id: true },
    });

    return user;
  }),

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
});
