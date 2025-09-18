import { generateUniqueSlug } from "@/lib/utils/slugify-server";
import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const listingsProcedures = {
  getListings: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.findMany({
      where: { userId: ctx.user.id },
    });
  }),
  syncListings: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      const upserts = await ctx.db.listing.findMany({
        where: {
          userId: ctx.user.id,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        orderBy: { updatedAt: "asc" },
      });
      // NOTE: Does not include deletions
      return upserts;
    }),
  insertListing: protectedProcedure
    .input(
      z.object({
        title: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const title = input.title;
      const slug = await generateUniqueSlug(title, ctx.user.id);

      const listing = await ctx.db.listing.create({
        data: {
          title,
          slug,
          userId: ctx.user.id,
        },
      });
      return listing;
    }),
  updateListing: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.update({
        where: { id: input.id },
        data: { title: input.title },
      });
      return listing;
    }),
  updateListingFields: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string().optional(),
          description: z.string().nullable().optional(),
          price: z.number().nullable().optional(),
          status: z.string().nullable().optional(),
          privateNote: z.string().nullable().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.update({
        where: { id: input.id, userId: ctx.user.id },
        data: input.data,
      });
      return listing;
    }),
  deleteListing: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.delete({
        where: { id: input.id },
      });
      return listing;
    }),
  setListingAhsId: protectedProcedure
    .input(z.object({ id: z.string(), ahsId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.listing.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { ahsId: input.ahsId },
      });
      return updated;
    }),
} as const;
