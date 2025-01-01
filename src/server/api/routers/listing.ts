import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { listingFormSchema } from "@/types/schemas/listing";
import { type PrismaClient } from "@prisma/client";

async function checkListingOwnership(
  userId: string,
  listingId: string,
  db: PrismaClient,
) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Listing not found",
    });
  }

  if (listing.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized",
    });
  }

  return listing;
}

export const listingRouter = createTRPCRouter({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.listing.create({
      data: {
        name: "New Listing",
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
        data: listingFormSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkListingOwnership(ctx.user.id, input.id, ctx.db);

      return ctx.db.listing.update({
        where: { id: input.id },
        data: input.data,
        include: {
          ahsListing: true,
          images: true,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkListingOwnership(ctx.user.id, input.id, ctx.db);

      return ctx.db.listing.delete({
        where: { id: input.id },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.id },
        include: {
          ahsListing: true,
          images: {
            orderBy: { order: "asc" },
          },
        },
      });

      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      return listing;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.findMany({
      where: { userId: ctx.user.id },
      include: {
        ahsListing: true,
        images: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),
});

export type ListingRouter = typeof listingRouter;

export type ListingGetOutput = inferRouterOutputs<ListingRouter>["get"];
export type ListingListOutput = inferRouterOutputs<ListingRouter>["list"];
