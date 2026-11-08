import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  readMembershipLists,
  writeListMemberships,
} from "@/server/db/list-membership";
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

const membershipId = z.string().min(1);
const membershipIds = z.array(membershipId).min(1);
const uniqueIds = (ids: string[]) => new Set(ids).size === ids.length;

async function changeMemberships(
  input: Parameters<typeof writeListMemberships>[0],
) {
  const result = await writeListMemberships(input);
  if (result.changed) return result.lists;

  if (result.lists.length !== input.lists.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
  }
  if (input.requireMembers) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Some listings are no longer in this list",
    });
  }
  if (input.lists[0]?.expectedUpdatedAt !== undefined) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "The lists or listing changed. Check the current selection and try again.",
    });
  }
  throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
}

const membershipPair = z.object({
  listId: membershipId,
  listingId: membershipId,
});
const changeSingleMembership = (present: boolean) =>
  protectedProcedure.input(membershipPair).mutation(async ({ ctx, input }) => {
    const [list] = await changeMemberships({
      userId: ctx.user.id,
      lists: [{ id: input.listId }],
      listingIds: [input.listingId],
      present,
    });
    return list!;
  });

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
              select: listSelect,
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
        return tx.list.create({ data, select: listSelect });
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

  list: protectedProcedure.query(({ ctx }) => readMembershipLists(ctx.user.id)),

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
        select: listSelect,
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
            ? "Remove all listings from this list before deleting it. Your listings will stay in your catalog."
            : "List not found",
        });
      }

      return { id: input.id } as const;
    }),

  changeListingMembership: protectedProcedure
    .input(
      z.object({
        listingId: membershipId,
        lists: z
          .array(
            z.object({
              id: membershipId,
              expectedUpdatedAt: z.iso.datetime(),
            }),
          )
          .min(1)
          .refine(
            (lists) => new Set(lists.map(({ id }) => id)).size === lists.length,
            "List IDs must be unique",
          ),
        present: z.boolean(),
      }),
    )
    .mutation(({ ctx, input }) =>
      changeMemberships({
        ...input,
        userId: ctx.user.id,
        listingIds: [input.listingId],
      }),
    ),

  addListingToList: changeSingleMembership(true),

  removeListingFromList: changeSingleMembership(false),

  removeListingsFromList: protectedProcedure
    .input(
      z.object({
        listId: membershipId,
        listingIds: membershipIds.max(20).refine(uniqueIds),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [list] = await changeMemberships({
        userId: ctx.user.id,
        lists: [{ id: input.listId }],
        listingIds: input.listingIds,
        present: false,
        requireMembers: true,
      });
      return list!;
    }),
});
