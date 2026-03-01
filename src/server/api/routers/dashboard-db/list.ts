import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { isPublished } from "@/server/db/public-visibility/filters";
import { invalidatePublicIsrForCatalogMutation } from "./public-isr-invalidation";

const listSelect = {
  id: true,
  userId: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  listings: {
    select: {
      id: true,
    },
  },
} as const;

export const dashboardDbListRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(10_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.db.list.create({
        data: {
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
        },
        select: listSelect,
      });

      await invalidatePublicIsrForCatalogMutation({
        db: ctx.db,
        userId: ctx.user.id,
        cultivarNormalizedNames: [],
      });

      return list;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const list = await ctx.db.list.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: listSelect,
      });
      if (!list) {
        throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      }
      return list;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.list.findMany({
      where: { userId: ctx.user.id },
      select: listSelect,
      orderBy: { createdAt: "desc" },
    });
  }),

  sync: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      return ctx.db.list.findMany({
        where: {
          userId: ctx.user.id,
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        select: listSelect,
        orderBy: { updatedAt: "asc" },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string().trim().min(1).max(200).optional(),
          description: z.string().trim().max(10_000).nullable().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.list.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: input.data,
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      }

      const [list, linkedCultivars] = await Promise.all([
        ctx.db.list.findUnique({
          where: { id: input.id },
          select: listSelect,
        }),
        ctx.db.listing.findMany({
          where: {
            userId: ctx.user.id,
            lists: { some: { id: input.id } },
            cultivarReferenceId: { not: null },
            ...isPublished(),
          },
          select: {
            cultivarReference: {
              select: {
                normalizedName: true,
              },
            },
          },
        }),
      ]);

      await invalidatePublicIsrForCatalogMutation({
        db: ctx.db,
        userId: ctx.user.id,
        cultivarNormalizedNames: linkedCultivars.map(
          (row) => row.cultivarReference?.normalizedName,
        ),
      });

      return list;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.db.list.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: {
          id: true,
          _count: { select: { listings: true } },
        },
      });
      if (!list) {
        throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      }
      if (list._count.listings > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete list with associated listings",
        });
      }

      await ctx.db.list.delete({ where: { id: list.id } });

      await invalidatePublicIsrForCatalogMutation({
        db: ctx.db,
        userId: ctx.user.id,
        cultivarNormalizedNames: [],
      });

      return { id: list.id } as const;
    }),

  addListingToList: protectedProcedure
    .input(z.object({ listId: z.string(), listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.listingId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      const list = await ctx.db.list.findFirst({
        where: { id: input.listId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!list) {
        throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      }

      return ctx.db.list.update({
        where: { id: list.id },
        data: {
          listings: { connect: { id: listing.id } },
        },
        select: listSelect,
      });
    }),

  removeListingFromList: protectedProcedure
    .input(z.object({ listId: z.string(), listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.listingId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      const list = await ctx.db.list.findFirst({
        where: { id: input.listId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!list) {
        throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
      }

      return ctx.db.list.update({
        where: { id: list.id },
        data: {
          listings: { disconnect: { id: listing.id } },
        },
        select: listSelect,
      });
    }),

  count: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.list.count({ where: { userId: ctx.user.id } });
  }),
});
