import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "@/server/api/trpc";
import { generateUniqueSlug } from "@/lib/utils/slugify-server";
import {
  getDisplayAhsListing,
  v2AhsCultivarDisplaySelect,
} from "@/lib/utils/ahs-display";
import { APP_CONFIG } from "@/config/constants";
import { getStripeSubscriptionResult } from "@/server/stripe/sync-subscription";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { slugify } from "@/lib/utils/slugify";
import { getCatalogImportExistingListingMatch } from "@/lib/catalog-import-existing-listings";
import {
  memberCreateId,
  reserveMemberCreateRequest,
} from "@/server/mcp/member-create-id";

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

const importListingSchema = z.object({
  allowExistingDuplicate: z.boolean().default(false),
  cultivarReferenceId: z.string().trim().min(1).nullable(),
  description: z.string().trim().max(10_000).nullable(),
  importKey: z.string().trim().min(1).max(300),
  price: z.number().nonnegative().nullable(),
  privateNote: z.string().trim().max(10_000).nullable(),
  title: z.string().trim().min(1).max(200),
});

function reserveUniqueSlug(title: string, reservedSlugs: Set<string>) {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let suffix = 1;

  while (reservedSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  reservedSlugs.add(slug);
  return slug;
}

function nextListingVersion(updatedAt: Date) {
  return new Date(Math.max(Date.now(), updatedAt.getTime() + 1));
}

export const dashboardDbListingRouter = createTRPCRouter({
  importRows: protectedProcedure
    .input(
      z.object({
        rows: z.array(importListingSchema).min(1).max(100),
        list: z
          .object({
            key: z.string().trim().min(1).max(200),
            title: z.string().trim().min(1).max(200),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rowsByImportKey = new Map(
        input.rows.map((row) => [row.importKey, row]),
      );
      if (rowsByImportKey.size !== input.rows.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Each imported row must have a unique import key.",
        });
      }

      const cultivarReferenceIds = [
        ...new Set(
          input.rows.flatMap((row) =>
            row.cultivarReferenceId ? [row.cultivarReferenceId] : [],
          ),
        ),
      ];
      if (cultivarReferenceIds.length > 0) {
        const references = await ctx.db.cultivarReference.findMany({
          where: { id: { in: cultivarReferenceIds } },
          select: { id: true },
        });
        const validIds = new Set(references.map((reference) => reference.id));
        const invalidId = cultivarReferenceIds.find((id) => !validIds.has(id));
        if (invalidId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Cultivar reference not found: ${invalidId}`,
          });
        }
      }

      const subscriptionResult =
        ctx._confirmedActiveMembership === undefined
          ? await getStripeSubscriptionResult(ctx.user.stripeCustomerId)
          : null;

      if (
        input.list &&
        !(
          ctx._confirmedActiveMembership === true ||
          (subscriptionResult?.confirmed &&
            hasActiveSubscription(subscriptionResult.subscription.status))
        )
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Upgrade to Pro to import a named list. If you already have Pro, retry once membership is confirmed.",
        });
      }
      const listId = input.list
        ? memberCreateId(
            "list",
            ctx.user.id,
            `catalog-import:${input.list.key}`,
          )
        : null;

      return ctx.db.$transaction(async (tx) => {
        let listUpdatedAt = new Date();
        if (listId && input.list) {
          const fresh = await reserveMemberCreateRequest(
            tx,
            "list",
            ctx.user.id,
            `catalog-import:${input.list.key}`,
            { title: input.list.title },
          );
          const existingList = await tx.list.findUnique({
            where: { id: listId },
          });
          if (
            (!fresh && !existingList) ||
            (existingList &&
              (existingList.userId !== ctx.user.id ||
                existingList.title !== input.list.title))
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "This import already has a named list. If it was renamed or deleted, start a new import.",
            });
          }
          if (existingList) {
            listUpdatedAt = new Date(
              Math.max(Date.now(), existingList.updatedAt.getTime() + 1),
            );
          }
        }
        const existingImportedRows = await tx.listing.findMany({
          where: {
            userId: ctx.user.id,
            importKey: { in: [...rowsByImportKey.keys()] },
          },
          select: { id: true, importKey: true },
        });
        const existingImportKeys = new Set(
          existingImportedRows.flatMap((row) =>
            row.importKey ? [row.importKey] : [],
          ),
        );
        const newImportRows = input.rows.filter(
          (row) => !existingImportKeys.has(row.importKey),
        );

        const existingListings = await tx.listing.findMany({
          where: { userId: ctx.user.id },
          select: {
            cultivarReferenceId: true,
            description: true,
            id: true,
            price: true,
            privateNote: true,
            slug: true,
            title: true,
          },
        });
        const rowsToCreate: z.infer<typeof importListingSchema>[] = [];
        const reusedListingIds: string[] = [];
        for (const row of newImportRows) {
          const match = getCatalogImportExistingListingMatch(
            row,
            existingListings,
          );
          if (match.kind === "possible" && !row.allowExistingDuplicate) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Review the existing listing for ${row.title} before importing.`,
            });
          }
          if (match.kind === "exact" && !row.allowExistingDuplicate) {
            reusedListingIds.push(match.listings[0]!.id);
          } else {
            rowsToCreate.push(row);
          }
        }

        if (
          rowsToCreate.length > 0 &&
          (ctx._confirmedActiveMembership === false ||
            (subscriptionResult?.confirmed &&
              !hasActiveSubscription(
                subscriptionResult.subscription.status,
              ))) &&
          existingListings.length + rowsToCreate.length >
            APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Upgrade to Pro to import this catalog.",
          });
        }

        if (rowsToCreate.length > 0) {
          const reservedSlugs = new Set(
            existingListings.map((listing) => listing.slug),
          );
          await tx.listing.createMany({
            data: rowsToCreate.map((row) => ({
              cultivarReferenceId: row.cultivarReferenceId,
              description: row.description,
              importKey: row.importKey,
              price: row.price,
              privateNote: row.privateNote,
              slug: reserveUniqueSlug(row.title, reservedSlugs),
              title: row.title,
              userId: ctx.user.id,
            })),
          });
        }

        const importedRows = await tx.listing.findMany({
          where: {
            userId: ctx.user.id,
            importKey: { in: [...rowsByImportKey.keys()] },
          },
          select: { id: true },
        });

        const listingIds = [
          ...new Set([
            ...importedRows.map((row) => row.id),
            ...reusedListingIds,
          ]),
        ];
        if (listId && input.list) {
          const listings = { connect: listingIds.map((id) => ({ id })) };
          await tx.list.upsert({
            where: { id: listId },
            create: {
              id: listId,
              title: input.list.title,
              userId: ctx.user.id,
              listings,
            },
            update: { listings, updatedAt: listUpdatedAt },
          });
        }

        return {
          listId,
          createdCount: rowsToCreate.length,
          existingCount: existingImportedRows.length,
          listingIds,
          skippedExactCount: reusedListingIds.length,
        };
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        cultivarReferenceId: z.string().trim().min(1).nullable().optional(),
        description: z.string().trim().max(10_000).nullable().optional(),
        price: z.number().nonnegative().nullable().optional(),
        privateNote: z.string().trim().max(10_000).nullable().optional(),
        hidden: z.boolean().optional(),
        requestId: z.uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = input.requestId
        ? memberCreateId("listing", ctx.user.id, input.requestId)
        : undefined;
      const subscriptionResult =
        ctx._confirmedActiveMembership === undefined
          ? await getStripeSubscriptionResult(ctx.user.stripeCustomerId)
          : null;
      if (input.cultivarReferenceId) {
        const cultivarReference = await ctx.db.cultivarReference.findUnique({
          where: { id: input.cultivarReferenceId },
          select: {
            id: true,
          },
        });
        if (!cultivarReference) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cultivar reference not found",
          });
        }
      }

      const listing = await ctx.db.$transaction(async (tx) => {
        if (id && input.requestId) {
          const fresh = await reserveMemberCreateRequest(
            tx,
            "listing",
            ctx.user.id,
            input.requestId,
            {
              title: input.title,
              cultivarReferenceId: input.cultivarReferenceId ?? null,
              description: input.description ?? null,
              price: input.price ?? null,
              privateNote: input.privateNote ?? null,
              status: input.hidden ? "HIDDEN" : null,
            },
          );
          if (!fresh) {
            const existing = await tx.listing.findUnique({
              where: { id },
              select: listingSelect,
            });
            if (existing?.userId === ctx.user.id) return existing;
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "This create request already completed. The listing was deleted.",
            });
          }
        }
        if (
          ctx._confirmedActiveMembership === false ||
          (subscriptionResult?.confirmed &&
            !hasActiveSubscription(subscriptionResult.subscription.status))
        ) {
          const existingListingsAtLimit = await tx.listing.findMany({
            where: { userId: ctx.user.id },
            select: { id: true },
            take: APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS,
          });
          if (
            existingListingsAtLimit.length >=
            APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Upgrade to Pro to create more listings.",
            });
          }
        }

        const slug = await generateUniqueSlug(
          input.title,
          ctx.user.id,
          undefined,
          tx,
        );
        const data = {
          ...(id ? { id } : {}),
          userId: ctx.user.id,
          title: input.title,
          slug,
          cultivarReferenceId: input.cultivarReferenceId ?? null,
          description: input.description ?? null,
          price: input.price ?? null,
          privateNote: input.privateNote ?? null,
          status: input.hidden ? "HIDDEN" : null,
        };
        return tx.listing.create({ data, select: listingSelect });
      });

      return listing;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: listingSelect,
      });
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }
      return listing;
    }),

  getByIds: protectedProcedure
    .input(z.object({ ids: z.array(z.string().min(1)).min(1).max(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.listing.findMany({
        where: { id: { in: input.ids }, userId: ctx.user.id },
        select: listingSelect,
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.findMany({
      where: { userId: ctx.user.id },
      select: listingSelect,
      orderBy: { createdAt: "desc" },
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
        select: {
          id: true,
          cultivarReferenceId: true,
          updatedAt: true,
        },
      });
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      if (
        listing.cultivarReferenceId &&
        listing.cultivarReferenceId !== input.cultivarReferenceId
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Listing is already linked to a cultivar. Unlink it first.",
        });
      }

      const cultivarReference = await ctx.db.cultivarReference.findUnique({
        where: { id: input.cultivarReferenceId },
        select: {
          id: true,
          v2AhsCultivar: { select: v2AhsCultivarDisplaySelect },
        },
      });
      if (!cultivarReference) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cultivar reference not found",
        });
      }

      const nextTitle = input.syncName
        ? getDisplayAhsListing(cultivarReference)?.name
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

      const updated = await ctx.db.listing.updateMany({
        where: {
          id: listing.id,
          userId: ctx.user.id,
          updatedAt: listing.updatedAt,
          OR: [
            { cultivarReferenceId: null },
            { cultivarReferenceId: input.cultivarReferenceId },
          ],
        },
        data: {
          cultivarReferenceId: cultivarReference.id,
          ...(nextTitle ? { title: nextTitle } : {}),
          ...(nextSlug ? { slug: nextSlug } : {}),
          updatedAt: nextListingVersion(listing.updatedAt),
        },
      });
      if (updated.count === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Listing link changed. Read it again before linking.",
        });
      }

      return ctx.db.listing.findFirstOrThrow({
        where: { id: listing.id, userId: ctx.user.id },
        select: listingSelect,
      });
    }),

  unlinkAhs: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: {
          id: true,
          updatedAt: true,
        },
      });
      if (!listing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }

      const updated = await ctx.db.listing.updateMany({
        where: {
          id: listing.id,
          userId: ctx.user.id,
          updatedAt: listing.updatedAt,
        },
        data: {
          cultivarReferenceId: null,
          updatedAt: nextListingVersion(listing.updatedAt),
        },
      });
      if (updated.count === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Listing changed. Read it again before unlinking.",
        });
      }

      return ctx.db.listing.findFirstOrThrow({
        where: { id: listing.id, userId: ctx.user.id },
        select: listingSelect,
      });
    }),

  syncAhsName: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: {
          id: true,
          cultivarReferenceId: true,
          updatedAt: true,
          cultivarReference: {
            select: {
              v2AhsCultivar: { select: v2AhsCultivarDisplaySelect },
            },
          },
        },
      });
      const name = listing?.cultivarReference
        ? getDisplayAhsListing(listing.cultivarReference)?.name
        : null;
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

      const updated = await ctx.db.listing.updateMany({
        where: {
          id: listing.id,
          userId: ctx.user.id,
          cultivarReferenceId: listing.cultivarReferenceId,
          updatedAt: listing.updatedAt,
        },
        data: {
          title: name,
          slug: nextSlug,
          updatedAt: nextListingVersion(listing.updatedAt),
        },
      });
      if (updated.count === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Listing cultivar link changed. Read it again before syncing.",
        });
      }

      return ctx.db.listing.findFirstOrThrow({
        where: { id: listing.id, userId: ctx.user.id },
        select: listingSelect,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        expectedUpdatedAt: z.iso.datetime(),
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
        select: {
          id: true,
          title: true,
          updatedAt: true,
        },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Listing not found",
        });
      }
      const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
      if (existing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "The listing changed. Load the latest version before saving.",
        });
      }

      const shouldRegenerateSlug =
        typeof input.data.title === "string" &&
        input.data.title !== existing.title;
      const nextSlug = shouldRegenerateSlug
        ? await generateUniqueSlug(
            input.data.title!,
            ctx.user.id,
            existing.id,
            ctx.db,
          )
        : undefined;

      const result = await ctx.db.listing.updateMany({
        where: {
          id: input.id,
          userId: ctx.user.id,
          updatedAt: expectedUpdatedAt,
        },
        data: {
          ...input.data,
          ...(nextSlug ? { slug: nextSlug } : {}),
          updatedAt: nextListingVersion(expectedUpdatedAt),
        },
      });
      if (result.count === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "The listing changed. Load the latest version before saving.",
        });
      }

      const updated = await ctx.db.listing.findFirstOrThrow({
        where: { id: input.id, userId: ctx.user.id },
        select: listingSelect,
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Advance affected list versions so an open editor detects this change.
      return ctx.db.$transaction(async (tx) => {
        const affectedLists = await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE "List"
          SET "updatedAt" = MAX("updatedAt" + 1, ${Date.now()})
          WHERE "userId" = ${ctx.user.id}
            AND "id" IN (
              SELECT "A" FROM "_ListToListing" WHERE "B" = ${input.id}
            )
          RETURNING "id"
        `;
        const deleted = await tx.listing.deleteMany({
          where: { id: input.id, userId: ctx.user.id },
        });
        if (deleted.count === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Listing not found",
          });
        }
        const lists = await tx.list.findMany({
          where: {
            id: { in: affectedLists.map((list) => list.id) },
            userId: ctx.user.id,
          },
          include: { listings: { select: { id: true } } },
        });
        return { id: input.id, lists };
      });
    }),
});
