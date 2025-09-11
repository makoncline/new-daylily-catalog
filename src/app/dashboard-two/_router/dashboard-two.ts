import { APP_CONFIG } from "@/config/constants";
import { generateUniqueSlug } from "@/lib/utils/slugify-server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import z from "zod";

export const dashboardTwoRouter = createTRPCRouter({
  getListings: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.findMany({
      where: { userId: ctx.user.id },
    });
  }),
  createListing: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const title = input.title ?? APP_CONFIG.LISTING.DEFAULT_NAME;
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
});
