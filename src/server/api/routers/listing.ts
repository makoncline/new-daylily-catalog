import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  type inferRouterInputs,
  type inferRouterOutputs,
  TRPCError,
} from "@trpc/server";
import { listingFormSchema } from "@/types/schemas/listing";
import { type PrismaClient } from "@prisma/client";
import { APP_CONFIG } from "@/config/constants";
import { generateUniqueSlug } from "@/lib/utils/slugify-server";
import { sortTitlesLettersBeforeNumbers } from "@/lib/utils/sort-utils";

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

export const listingInclude = {
  ahsListing: true,
  images: {
    orderBy: { order: "asc" },
  },
  lists: true,
} as const;

export const listingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        ahsId: z.string().nullable().optional(),
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
          ahsId: input.ahsId,
        },
        include: listingInclude,
      });
      return listing;
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

      // Generate new slug if title changed
      const slug =
        input.data.title && input.data.title !== listing.title
          ? await generateUniqueSlug(input.data.title, ctx.user.id, listing.id)
          : undefined;

      const updatedListing = await ctx.db.listing.update({
        where: { id: input.id },
        data: {
          title: input.data.title,
          slug: slug,
          price: input.data.price,
          description: input.data.description,
          privateNote: input.data.privateNote,
          ahsId: input.data.ahsId,
          status: input.data.status,
        },
        include: listingInclude,
      });

      return updatedListing;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkListingOwnership(ctx.user.id, input.id, ctx.db);

      const listing = await ctx.db.listing.delete({
        where: { id: input.id },
      });
      return listing;
    }),

  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkImageOwnership(ctx.user.id, input.imageId, ctx.db);

      await ctx.db.image.delete({
        where: { id: input.imageId },
      });

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

      await checkImageOwnership(ctx.user.id, firstImage.id, ctx.db);

      await ctx.db.$transaction(
        input.images.map((img) =>
          ctx.db.image.update({
            where: { id: img.id },
            data: { order: img.order },
          }),
        ),
      );

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

      return image;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.id },
        include: listingInclude,
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
    const items = await ctx.db.listing.findMany({
      where: { userId: ctx.user.id },
      include: listingInclude,
    });

    return sortTitlesLettersBeforeNumbers(items);
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
          title:
            input.syncName && ahsListing.name ? ahsListing.name : undefined,
        },
        include: listingInclude,
      });

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
        include: listingInclude,
      });

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
          title: listing.ahsListing.name,
        },
        include: listingInclude,
      });

      return updatedListing;
    }),

  getUserLists: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.list.findMany({
      where: { userId: ctx.user.id },
      include: {
        _count: {
          select: {
            listings: true,
          },
        },
      },
      orderBy: [{ listings: { _count: "desc" } }, { title: "asc" }],
    });
  }),

  createList: protectedProcedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.list.create({
        data: {
          title: input.title,
          userId: ctx.user.id,
        },
      });
    }),

  updateLists: protectedProcedure
    .input(z.object({ id: z.string(), listIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await checkListingOwnership(ctx.user.id, input.id, ctx.db);

      // Verify all lists exist and belong to user
      const lists = await ctx.db.list.findMany({
        where: {
          id: { in: input.listIds },
          userId: ctx.user.id,
        },
      });

      if (lists.length !== input.listIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more lists not found",
        });
      }

      const updatedListing = await ctx.db.listing.update({
        where: { id: input.id },
        data: {
          lists: {
            set: input.listIds.map((id) => ({ id })),
          },
        },
        include: listingInclude,
      });

      return updatedListing;
    }),

  getBySlugOrId: protectedProcedure
    .input(z.object({ slugOrId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Try finding by slug first (case insensitive)
      const listingBySlug = await ctx.db.listing.findFirst({
        where: {
          userId: ctx.user.id,
          slug: input.slugOrId.toLowerCase(),
        },
        include: listingInclude,
      });

      if (listingBySlug) {
        return listingBySlug;
      }

      // If not found by slug, try by ID
      const listingById = await ctx.db.listing.findUnique({
        where: {
          id: input.slugOrId,
          userId: ctx.user.id,
        },
        include: listingInclude,
      });

      if (!listingById) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      return listingById;
    }),

  count: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.count({
      where: { userId: ctx.user.id },
    });
  }),
});

export type ListingRouter = typeof listingRouter;
export type ListingRouterOutputs = inferRouterOutputs<ListingRouter>;
export type ListingRouterInput = inferRouterInputs<ListingRouter>;

export type ListingGetOutput = ListingRouterOutputs["get"];
export type ListingListOutput = ListingRouterInput["list"];
