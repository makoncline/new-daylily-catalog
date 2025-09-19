import { generateUniqueSlug } from "@/lib/utils/slugify-server";
import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
// IMPORTANT: All procedures in this router MUST scope by ctx.user.id.
// Always include `where: { userId: ctx.user.id }` (and `id` when applicable)
// so operations apply only to the authenticated user's records.
// Ownership is enforced inline via `where: { id, userId }` for mutations.

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
        title: z.string().trim().min(1).max(200),
        ahsId: z.string().trim().min(1).nullable().optional(),
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
          ahsId: input.ahsId ?? undefined,
        },
      });
      return listing;
    }),
  updateListing: protectedProcedure
    .input(
      z.object({
        id: z.cuid(),
        data: z
          .object({
            title: z.string().trim().min(1).max(200).optional(),
            description: z.string().trim().max(10_000).nullable().optional(),
            price: z.coerce.number().nonnegative().nullable().optional(),
            // Status: null (published) or "HIDDEN"
            status: z.enum(["HIDDEN"]).nullable().optional(),
            privateNote: z.string().trim().max(10_000).nullable().optional(),
          })
          .strict()
          .refine((v) => Object.keys(v).length > 0, {
            message: "No fields to update",
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;
      const result = await ctx.db.listing.updateMany({
        where: { id, userId: ctx.user.id },
        data,
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }
      // Fetch and return the updated record for client convenience
      const updated = await ctx.db.listing.findUnique({ where: { id } });
      return updated!;
    }),
  deleteListing: protectedProcedure
    .input(z.object({ id: z.cuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.listing.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }
      // Return a minimal shape; the row is gone
      return { id: input.id } as { id: string };
    }),
  setListingAhsId: protectedProcedure
    .input(
      z.object({
        id: z.cuid(),
        ahsId: z.string().trim().min(1).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.listing.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { ahsId: input.ahsId },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }
      const updated = await ctx.db.listing.findUnique({
        where: { id: input.id },
      });
      return updated!;
    }),
} as const;
