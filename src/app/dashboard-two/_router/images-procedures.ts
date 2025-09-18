import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const imagesProcedures = {
  getImages: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.image.findMany({
      where: {
        listing: { userId: ctx.user.id },
      },
      orderBy: [{ listingId: "asc" }, { order: "asc" }],
    });
  }),

  syncImages: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      const upserts = await ctx.db.image.findMany({
        where: {
          listing: { userId: ctx.user.id },
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        orderBy: { updatedAt: "asc" },
      });
      // NOTE: Does not include deletions
      return upserts;
    }),

  createImage: protectedProcedure
    .input(z.object({ listingId: z.string(), url: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Ensure listing belongs to user
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.listingId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) throw new Error("Listing not found or not owned by user");

      const currentCount = await ctx.db.image.count({
        where: { listingId: input.listingId },
      });

      const image = await ctx.db.image.create({
        data: {
          url: input.url,
          order: currentCount,
          listingId: input.listingId,
        },
      });
      return image;
    }),

  reorderImages: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        images: z
          .array(z.object({ id: z.string(), order: z.number().int().min(0) }))
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate listing ownership
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.listingId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) throw new Error("Listing not found or not owned by user");

      // Update provided images; any others will maintain their order
      await ctx.db.$transaction(
        input.images.map((img) =>
          ctx.db.image.update({
            where: { id: img.id },
            data: { order: img.order },
          }),
        ),
      );
      return { success: true } as const;
    }),

  deleteImage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure image belongs to a listing owned by user and capture listingId
      const image = await ctx.db.image.findFirst({
        where: { id: input.id, listing: { userId: ctx.user.id } },
        select: { id: true, listingId: true },
      });
      if (!image || !image.listingId)
        throw new Error("Image not found or not owned by user");

      const deleted = await ctx.db.image.delete({ where: { id: input.id } });

      // Re-number remaining images for that listing to keep a dense order
      const remaining = await ctx.db.image.findMany({
        where: { listingId: image.listingId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      await ctx.db.$transaction(
        remaining.map((img, index) =>
          ctx.db.image.update({
            where: { id: img.id },
            data: { order: index },
          }),
        ),
      );

      return deleted;
    }),
} as const;
