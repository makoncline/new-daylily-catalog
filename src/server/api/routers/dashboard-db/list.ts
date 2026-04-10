import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  buildListMembershipMutationRefs,
  buildListUpdateRefs,
  buildSellerMutationRefs,
} from "./public-isr-reference-helpers";
import {
  assertOwnedList,
  assertOwnedListing,
  invalidateDashboardMutation,
  parseDashboardSyncSince,
} from "./dashboard-db-router-helpers";

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

      await invalidateDashboardMutation({
        db: ctx.db,
        requestUrl: ctx.requestUrl,
        references: buildSellerMutationRefs(ctx.user.id),
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
      const since = parseDashboardSyncSince(input.since);
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

      const list = await ctx.db.list.findUnique({
        where: { id: input.id },
        select: listSelect,
      });

      await invalidateDashboardMutation({
        db: ctx.db,
        requestUrl: ctx.requestUrl,
        references: buildListUpdateRefs({
          listingIds: list?.listings.map((listing) => listing.id) ?? [],
          userId: ctx.user.id,
        }),
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

      await invalidateDashboardMutation({
        db: ctx.db,
        requestUrl: ctx.requestUrl,
        references: buildSellerMutationRefs(ctx.user.id),
      });

      return { id: list.id } as const;
    }),

  addListingToList: protectedProcedure
    .input(z.object({ listId: z.string(), listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnedListing({
        db: ctx.db,
        listingId: input.listingId,
        userId: ctx.user.id,
      });
      await assertOwnedList({
        db: ctx.db,
        listId: input.listId,
        userId: ctx.user.id,
      });

      const updated = await ctx.db.list.update({
        where: { id: input.listId },
        data: {
          listings: { connect: { id: input.listingId } },
        },
        select: listSelect,
      });

      await invalidateDashboardMutation({
        db: ctx.db,
        requestUrl: ctx.requestUrl,
        references: buildListMembershipMutationRefs({
          listingId: input.listingId,
          userId: ctx.user.id,
        }),
      });

      return updated;
    }),

  removeListingFromList: protectedProcedure
    .input(z.object({ listId: z.string(), listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnedListing({
        db: ctx.db,
        listingId: input.listingId,
        userId: ctx.user.id,
      });
      await assertOwnedList({
        db: ctx.db,
        listId: input.listId,
        userId: ctx.user.id,
      });

      const updated = await ctx.db.list.update({
        where: { id: input.listId },
        data: {
          listings: { disconnect: { id: input.listingId } },
        },
        select: listSelect,
      });

      await invalidateDashboardMutation({
        db: ctx.db,
        requestUrl: ctx.requestUrl,
        references: buildListMembershipMutationRefs({
          listingId: input.listingId,
          userId: ctx.user.id,
        }),
      });

      return updated;
    }),

  count: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.list.count({ where: { userId: ctx.user.id } });
  }),
});
