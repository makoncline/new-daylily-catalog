import { protectedProcedure } from "@/server/api/trpc";
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
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const title = input.title ?? "New List";
      const list = await ctx.db.list.create({
        data: {
          title,
          userId: ctx.user.id,
        },
      });
      return list;
    }),
  updateList: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.db.list.update({
        where: { id: input.id },
        data: { title: input.title },
      });
      return list;
    }),
  deleteList: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.db.list.delete({
        where: { id: input.id },
      });
      return list;
    }),
} as const;
