import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  resolveAuthenticatedClerkUserId,
} from "@/server/api/trpc";
import type { TRPCInternalContext } from "@/server/api/trpc";

export const dashboardDbUserRouter = createTRPCRouter({
  getCurrentUserId: publicProcedure
    .input(z.object({ clerkUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const contextUser = (ctx as TRPCInternalContext)._authUser;
      const clerkUserId =
        contextUser?.clerkUserId ??
        (typeof ctx.clerkUserId === "undefined"
          ? await resolveAuthenticatedClerkUserId()
          : ctx.clerkUserId);

      if (!clerkUserId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      if (input.clerkUserId !== clerkUserId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Your account changed. Reload this page.",
        });
      }
      if (contextUser) return { id: contextUser.id };

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
