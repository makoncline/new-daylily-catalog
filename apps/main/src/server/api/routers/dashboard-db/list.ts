import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  assertOwnedList,
  assertOwnedListing,
  dashboardSyncInputSchema,
  parseDashboardSyncSince,
} from "./dashboard-db-router-helpers";
import { APP_CONFIG } from "@/config/constants";
import { getStripeSubscriptionResult } from "@/server/stripe/sync-subscription";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import {
  memberCreateId,
  reserveMemberCreateRequest,
} from "@/server/mcp/member-create-id";

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

const listBaseSelect = {
  id: true,
  userId: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ListBaseRow = Prisma.ListGetPayload<{
  select: typeof listBaseSelect;
}>;

async function attachListListingIds(db: PrismaClient, lists: ListBaseRow[]) {
  if (!lists.length) {
    return [];
  }

  const listIds = lists.map((list) => list.id);
  const memberships = await db.$queryRaw<Array<{ A: string; B: string }>>(
    Prisma.sql`
      SELECT "A", "B"
      FROM "_ListToListing"
      WHERE "A" IN (${Prisma.join(listIds)})
    `,
  );

  const listingIdsByListId = new Map<string, Array<{ id: string }>>();
  memberships.forEach((membership) => {
    const rows = listingIdsByListId.get(membership.A) ?? [];
    rows.push({ id: membership.B });
    listingIdsByListId.set(membership.A, rows);
  });

  return lists.map((list) => ({
    ...list,
    listings: listingIdsByListId.get(list.id) ?? [],
  }));
}

async function advanceListVersion(
  tx: Prisma.TransactionClient,
  listId: string,
  userId: string,
) {
  await tx.$executeRaw`
    UPDATE "List"
    SET "updatedAt" = MAX("updatedAt" + 1, ${Date.now()})
    WHERE "id" = ${listId} AND "userId" = ${userId}
  `;
  return tx.list.findFirstOrThrow({
    where: { id: listId, userId },
    select: listBaseSelect,
  });
}

export const dashboardDbListRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(10_000).optional(),
        requestId: z.uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = input.requestId
        ? memberCreateId("list", ctx.user.id, input.requestId)
        : undefined;
      const subscriptionResult =
        ctx._confirmedActiveMembership === undefined
          ? await getStripeSubscriptionResult(ctx.user.stripeCustomerId)
          : null;

      return ctx.db.$transaction(async (tx) => {
        if (id && input.requestId) {
          const fresh = await reserveMemberCreateRequest(
            tx,
            "list",
            ctx.user.id,
            input.requestId,
            {
              title: input.title,
              description: input.description ?? null,
            },
          );
          if (!fresh) {
            const existing = await tx.list.findUnique({
              where: { id },
              select: listBaseSelect,
            });
            if (existing?.userId === ctx.user.id) return existing;
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "This create request already completed. The list was deleted.",
            });
          }
        }
        if (
          ctx._confirmedActiveMembership === false ||
          (subscriptionResult?.confirmed &&
            !hasActiveSubscription(subscriptionResult.subscription.status))
        ) {
          const existingLists = await tx.list.findMany({
            where: { userId: ctx.user.id },
            select: { id: true },
            take: APP_CONFIG.LIST.FREE_TIER_MAX_LISTS,
          });
          if (existingLists.length >= APP_CONFIG.LIST.FREE_TIER_MAX_LISTS) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Upgrade to Pro to create more lists.",
            });
          }
        }

        const data = {
          ...(id ? { id } : {}),
          userId: ctx.user.id,
          title: input.title,
          description: input.description ?? null,
        };
        return tx.list.create({ data, select: listBaseSelect });
      });
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
    const lists = await ctx.db.list.findMany({
      where: { userId: ctx.user.id },
      select: listBaseSelect,
      orderBy: { createdAt: "desc" },
    });

    return attachListListingIds(ctx.db, lists);
  }),

  sync: protectedProcedure
    .input(dashboardSyncInputSchema)
    .query(async ({ ctx, input }) => {
      const since = parseDashboardSyncSince(input.since);
      const lists = await ctx.db.list.findMany({
        where: {
          userId: ctx.user.id,
          ...(since ? { updatedAt: { gte: since } } : {}),
          ...(input.cursor ? { id: { gt: input.cursor.id } } : {}),
        },
        select: listBaseSelect,
        orderBy: { id: "asc" },
        ...(input.limit ? { take: input.limit } : {}),
      });

      return attachListListingIds(ctx.db, lists);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        expectedUpdatedAt: z.iso.datetime(),
        data: z.object({
          title: z.string().trim().min(1).max(200).optional(),
          description: z.string().trim().max(10_000).nullable().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
      const result = await ctx.db.list.updateMany({
        where: {
          id: input.id,
          userId: ctx.user.id,
          updatedAt: expectedUpdatedAt,
        },
        data: {
          ...input.data,
          updatedAt: new Date(
            Math.max(Date.now(), expectedUpdatedAt.getTime() + 1),
          ),
        },
      });
      if (result.count === 0) {
        const ownedList = await ctx.db.list.findFirst({
          where: { id: input.id, userId: ctx.user.id },
          select: { id: true },
        });
        throw new TRPCError({
          code: ownedList ? "CONFLICT" : "NOT_FOUND",
          message: ownedList
            ? "The list changed. Load the latest version before saving."
            : "List not found",
        });
      }

      const list = await ctx.db.list.findFirstOrThrow({
        where: { id: input.id, userId: ctx.user.id },
        select: listBaseSelect,
      });

      return list;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.$executeRaw`
        DELETE FROM "List"
        WHERE "id" = ${input.id}
          AND "userId" = ${ctx.user.id}
          AND NOT EXISTS (
            SELECT 1 FROM "_ListToListing" WHERE "A" = ${input.id}
          )
      `;
      if (deleted === 0) {
        const list = await ctx.db.list.findFirst({
          where: { id: input.id, userId: ctx.user.id },
          select: { id: true },
        });
        throw new TRPCError({
          code: list ? "PRECONDITION_FAILED" : "NOT_FOUND",
          message: list
            ? "Cannot delete list with associated listings"
            : "List not found",
        });
      }

      return { id: input.id } as const;
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

      const updated = await ctx.db.$transaction(async (tx) => {
        await tx.list.update({
          where: { id: input.listId, userId: ctx.user.id },
          data: { listings: { connect: { id: input.listingId } } },
        });
        return advanceListVersion(tx, input.listId, ctx.user.id);
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

      const updated = await ctx.db.$transaction(async (tx) => {
        await tx.list.update({
          where: { id: input.listId, userId: ctx.user.id },
          data: { listings: { disconnect: { id: input.listingId } } },
        });
        return advanceListVersion(tx, input.listId, ctx.user.id);
      });

      return updated;
    }),

  removeListingsFromList: protectedProcedure
    .input(
      z.object({
        listId: z.string().min(1),
        listingIds: z
          .array(z.string().min(1))
          .min(1)
          .max(20)
          .refine(
            (ids) => new Set(ids).size === ids.length,
            "Listing IDs must be unique",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const list = await tx.list.findFirst({
          where: { id: input.listId, userId: ctx.user.id },
          select: { id: true },
        });
        if (!list) {
          throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
        }
        const members = await tx.listing.findMany({
          where: {
            id: { in: input.listingIds },
            userId: ctx.user.id,
            lists: { some: { id: input.listId } },
          },
          select: { id: true },
        });
        if (members.length !== input.listingIds.length) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Some listings are no longer in this list",
          });
        }
        await tx.list.update({
          where: { id: input.listId, userId: ctx.user.id },
          data: {
            listings: {
              disconnect: input.listingIds.map((id) => ({ id })),
            },
          },
        });
        return advanceListVersion(tx, input.listId, ctx.user.id);
      });
    }),
});
