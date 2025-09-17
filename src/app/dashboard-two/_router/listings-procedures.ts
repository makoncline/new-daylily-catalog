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
  deleteListing: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.delete({
        where: { id: input.id },
      });
      return listing;
    }),
} as const;
