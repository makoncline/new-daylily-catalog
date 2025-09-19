import { protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const listsProcedures = {
  getLists: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.list.findMany({
      where: { userId: ctx.user.id },
      include: { listings: { select: { id: true } } },
    });
  }),
  syncLists: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      const upserts = await ctx.db.list.findMany({
        where: {
          userId: ctx.user.id,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        orderBy: { updatedAt: "asc" },
        include: { listings: { select: { id: true } } },
      });
      // NOTE: Does not include deletions
      return upserts;
    }),
  addListingToList: protectedProcedure
    .input(z.object({ listId: z.string(), listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify both resources belong to the current user
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.listingId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }
      const updated = await ctx.db.list.update({
        where: { id: input.listId, userId: ctx.user.id },
        data: {
          listings: { connect: { id: input.listingId } },
        },
        include: { listings: { select: { id: true } } },
      });
      return updated;
    }),
  removeListingFromList: protectedProcedure
    .input(z.object({ listId: z.string(), listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify listing ownership as well
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.listingId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }
      const updated = await ctx.db.list.update({
        where: { id: input.listId, userId: ctx.user.id },
        data: {
          listings: { disconnect: { id: input.listingId } },
        },
        include: { listings: { select: { id: true } } },
      });
      return updated;
    }),
  insertList: protectedProcedure
    .input(z.object({ title: z.string().trim().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const title = input.title;
      const list = await ctx.db.list.create({
        data: {
          title,
          userId: ctx.user.id,
        },
      });
      return list;
    }),
  updateList: protectedProcedure
    .input(
      z.object({ id: z.string(), title: z.string().trim().min(1).max(200) }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.list.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { title: input.title },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "List not found or not owned by user",
        });
      }
      return ctx.db.list.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { listings: { select: { id: true } } },
      });
    }),
  deleteList: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.list.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "List not found or not owned by user",
        });
      }
      return { id: input.id } as const;
    }),
} as const;
