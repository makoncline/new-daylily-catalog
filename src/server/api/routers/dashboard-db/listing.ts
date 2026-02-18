import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { generateUniqueSlug } from "@/lib/utils/slugify-server";

const listingSelect = {
  id: true,
  userId: true,
  title: true,
  slug: true,
  price: true,
  description: true,
  privateNote: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  cultivarReferenceId: true,
} as const;

export const dashboardDbListingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        cultivarReferenceId: z.string().trim().min(1).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.cultivarReferenceId) {
        const exists = await ctx.db.cultivarReference.findUnique({
          where: { id: input.cultivarReferenceId },
          select: { id: true },
        });
        if (!exists) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cultivar reference not found",
          });
        }
      }

      const slug = await generateUniqueSlug(
        input.title,
        ctx.user.id,
        undefined,
        ctx.db,
      );

      const createdListing = await ctx.db.listing.create({
        data: {
          userId: ctx.user.id,
          title: input.title,
          slug,
          cultivarReferenceId: input.cultivarReferenceId ?? null,
        },
        select: listingSelect,
      });

      return createdListing;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: listingSelect,
      });
      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }
      return listing;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.findMany({
      where: { userId: ctx.user.id },
      select: listingSelect,
      orderBy: { createdAt: "desc" },
    });
  }),

  sync: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      return ctx.db.listing.findMany({
        where: {
          userId: ctx.user.id,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        select: listingSelect,
        orderBy: { updatedAt: "asc" },
      });
    }),

  linkAhs: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        cultivarReferenceId: z.string(),
        syncName: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }

      const cultivarReference = await ctx.db.cultivarReference.findUnique({
        where: { id: input.cultivarReferenceId },
        select: {
          id: true,
          ahsListing: { select: { name: true } },
        },
      });
      if (!cultivarReference) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cultivar reference not found",
        });
      }

      const nextTitle = input.syncName
        ? cultivarReference.ahsListing?.name
        : undefined;
      if (input.syncName && !nextTitle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AHS listing not found",
        });
      }

      const nextSlug = nextTitle
        ? await generateUniqueSlug(nextTitle, ctx.user.id, listing.id, ctx.db)
        : undefined;

      const updatedListing = await ctx.db.listing.update({
        where: { id: listing.id },
        data: {
          cultivarReferenceId: cultivarReference.id,
          ...(nextTitle ? { title: nextTitle } : {}),
          ...(nextSlug ? { slug: nextSlug } : {}),
        },
        select: listingSelect,
      });

      return updatedListing;
    }),

  unlinkAhs: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }

      const updatedListing = await ctx.db.listing.update({
        where: { id: listing.id },
        data: { cultivarReferenceId: null },
        select: listingSelect,
      });

      return updatedListing;
    }),

  syncAhsName: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: {
          id: true,
          cultivarReference: {
            select: { ahsListing: { select: { name: true } } },
          },
        },
      });
      const name = listing?.cultivarReference?.ahsListing?.name;
      if (!listing?.id || !name) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No AHS listing linked",
        });
      }

      const nextSlug = await generateUniqueSlug(
        name,
        ctx.user.id,
        listing.id,
        ctx.db,
      );

      const updatedListing = await ctx.db.listing.update({
        where: { id: listing.id },
        data: { title: name, slug: nextSlug },
        select: listingSelect,
      });

      return updatedListing;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string().trim().min(1).max(200).optional(),
          description: z.string().trim().max(10_000).nullable().optional(),
          price: z.number().nonnegative().nullable().optional(),
          status: z.enum(["HIDDEN"]).nullable().optional(),
          privateNote: z.string().trim().max(10_000).nullable().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.listing.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true, title: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }

      const shouldRegenerateSlug =
        typeof input.data.title === "string" && input.data.title !== existing.title;
      const nextSlug = shouldRegenerateSlug
        ? await generateUniqueSlug(
            input.data.title!,
            ctx.user.id,
            existing.id,
            ctx.db,
          )
        : undefined;

      const result = await ctx.db.listing.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: {
          ...input.data,
          ...(nextSlug ? { slug: nextSlug } : {}),
        },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }

      const updated = await ctx.db.listing.findUnique({
        where: { id: input.id },
        select: listingSelect,
      });
      return updated!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      }

      // Deleting a listing clears join rows, but does not automatically bump List.updatedAt.
      // We touch affected lists so incremental `list.sync({ since })` can't retain dead listing ids.
      const affectedLists = await ctx.db.list.findMany({
        where: {
          userId: ctx.user.id,
          listings: { some: { id: listing.id } },
        },
        select: { id: true },
      });

      await ctx.db.$transaction(async (tx) => {
        await tx.listing.delete({ where: { id: listing.id } });

        if (affectedLists.length) {
          await tx.list.updateMany({
            where: {
              userId: ctx.user.id,
              id: { in: affectedLists.map((l) => l.id) },
            },
            data: { updatedAt: new Date() },
          });
        }
      });

      return { id: listing.id } as const;
    }),

  count: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.count({ where: { userId: ctx.user.id } });
  }),
});
