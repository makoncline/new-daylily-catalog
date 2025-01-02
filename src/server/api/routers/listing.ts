import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { listingFormSchema } from "@/types/schemas/listing";
import { type PrismaClient, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

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

async function checkImageOwnership(
  userId: string,
  imageId: string,
  db: PrismaClient,
) {
  const image = await db.image.findUnique({
    where: { id: imageId },
    include: { listing: true },
  });

  if (!image || !image.listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Image not found",
    });
  }

  if (image.listing.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized",
    });
  }

  return image;
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
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.id },
      });

      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      const updatedListing = await ctx.db.listing.update({
        where: { id: input.id },
        data: input.data,
        include: {
          ahsListing: true,
          images: {
            orderBy: { order: "asc" },
          },
        },
      });

      revalidatePath("/listings");
      return updatedListing;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkListingOwnership(ctx.user.id, input.id, ctx.db);

      return ctx.db.listing.delete({
        where: { id: input.id },
      });
    }),

  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const image = await checkImageOwnership(
        ctx.user.id,
        input.imageId,
        ctx.db,
      );

      // Delete the image
      await ctx.db.image.delete({
        where: { id: input.imageId },
      });

      // Cache invalidation
      revalidatePath("/listings");
      revalidatePath(`/listings/${image.listingId}/edit`);

      return { success: true };
    }),

  reorderImages: protectedProcedure
    .input(
      z.object({
        images: z.array(
          z.object({
            id: z.string(),
            order: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [firstImage] = input.images;
      if (!firstImage) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No images to reorder",
        });
      }

      // Get first image to check ownership
      const image = await checkImageOwnership(
        ctx.user.id,
        firstImage.id,
        ctx.db,
      );

      // Update all images with their new orders
      await ctx.db.$transaction(
        input.images.map((img) =>
          ctx.db.image.update({
            where: { id: img.id },
            data: { order: img.order },
          }),
        ),
      );

      // Cache invalidation
      revalidatePath("/listings");
      revalidatePath(`/listings/${image.listingId}/edit`);

      return { success: true };
    }),

  addImage: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        listingId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkListingOwnership(ctx.user.id, input.listingId, ctx.db);

      // Get the current highest order value
      const lastImage = await ctx.db.image.findFirst({
        where: { listingId: input.listingId },
        orderBy: { order: "desc" },
      });
      const nextOrder = lastImage ? lastImage.order + 1 : 0;

      const image = await ctx.db.image.create({
        data: {
          url: input.url,
          order: nextOrder,
          listing: {
            connect: { id: input.listingId },
          },
        },
      });

      // Cache invalidation
      revalidatePath("/listings");
      revalidatePath(`/listings/${input.listingId}/edit`);

      return image;
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

  linkAhs: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        ahsId: z.string(),
        syncName: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.id },
      });

      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      const ahsListing = await ctx.db.ahsListing.findUnique({
        where: { id: input.ahsId },
      });

      if (!ahsListing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AHS listing not found",
        });
      }

      const updatedListing = await ctx.db.listing.update({
        where: { id: input.id },
        data: {
          ahsId: input.ahsId,
          name: input.syncName && ahsListing.name ? ahsListing.name : undefined,
        },
        include: {
          ahsListing: true,
          images: {
            orderBy: { order: "asc" },
          },
        },
      });

      revalidatePath("/listings");
      return updatedListing;
    }),

  unlinkAhs: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.id },
      });

      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      const updatedListing = await ctx.db.listing.update({
        where: { id: input.id },
        data: {
          ahsId: null,
        },
        include: {
          ahsListing: true,
          images: {
            orderBy: { order: "asc" },
          },
        },
      });

      revalidatePath("/listings");
      return updatedListing;
    }),

  syncAhsName: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.id },
        include: { ahsListing: true },
      });

      if (!listing?.ahsListing?.name) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No AHS listing linked",
        });
      }

      const updatedListing = await ctx.db.listing.update({
        where: { id: input.id },
        data: {
          name: listing.ahsListing.name,
        },
        include: {
          ahsListing: true,
          images: {
            orderBy: { order: "asc" },
          },
        },
      });

      revalidatePath("/listings");
      return updatedListing;
    }),
});

export type ListingRouter = typeof listingRouter;

export type ListingGetOutput = inferRouterOutputs<ListingRouter>["get"];
export type ListingListOutput = inferRouterOutputs<ListingRouter>["list"];
