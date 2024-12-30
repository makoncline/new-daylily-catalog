import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { listingSchema } from "@/types/schemas/listing";
import { z } from "zod";

// Helper to check if a user owns a listing
async function checkListingOwnership(
  ctx: Awaited<ReturnType<typeof createTRPCContext>>,
  listingId: string,
) {
  const listing = await ctx.db.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Listing not found",
    });
  }

  const isOwner = ctx.user?.id === listing.userId;

  return {
    listing,
    isOwner,
  } as const;
}

export const listingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(listingSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.listing.create({
        data: {
          ...input,
          userId: ctx.user.id,
        },
        include: {
          ahsListing: true,
          images: true,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: listingSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { listing, isOwner } = await checkListingOwnership(ctx, input.id);

      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return ctx.db.listing.update({
        where: { id: input.id },
        data: input.data,
        include: {
          ahsListing: true,
          images: {
            orderBy: { order: "asc" },
          },
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { listing, isOwner } = await checkListingOwnership(ctx, input.id);

      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return ctx.db.listing.delete({
        where: { id: input.id },
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.id },
        include: {
          ahsListing: true,
          images: {
            orderBy: { order: "asc" },
          },
          list: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      // Only include privateNote if the user owns the listing
      const isOwner = ctx.user?.id === listing.userId;
      if (!isOwner) {
        listing.privateNote = null;
      }

      return listing;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.findMany({
      where: { userId: ctx.user.id },
      include: {
        ahsListing: true,
        images: {
          take: 1,
          orderBy: { order: "asc" },
        },
        list: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),
});
