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
import {
  getCatalogImportExistingListingMatch,
  normalizeCatalogImportName,
} from "@/lib/catalog-import-existing-listings";
import { normalizeCatalogListNames } from "@/lib/catalog-importer";
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
  cultivarReferenceId: z.string().trim().min(1).nullable(),
  description: z.string().trim().max(10_000).nullable(),
  importKey: z.string().trim().min(1).max(300),
  lists: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
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
    .input(z.object({ rows: z.array(importListingSchema).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const rows = input.rows.map((row) => ({
        ...row,
        lists: normalizeCatalogListNames(row.lists),
      }));
      const rowsByImportKey = new Map(rows.map((row) => [row.importKey, row]));
      if (rowsByImportKey.size !== rows.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Each imported row must have a unique import key.",
        });
      }

      const listRequests = new Map<
        string,
        { title: string; requestId: string }
      >();
      for (const row of rows) {
        for (const title of row.lists) {
          const name = normalizeCatalogImportName(title);
          if (!listRequests.has(name)) {
            listRequests.set(name, {
              title,
              requestId: `catalog-import:${row.importKey}:${name}`,
            });
          }
        }
      }
      if (listRequests.size > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Import at most 100 lists at a time.",
        });
      }

      const cultivarReferenceIds = [
        ...new Set(
          rows.flatMap((row) =>
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
        if (cultivarReferenceIds.some((id) => !validIds.has(id))) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "A linked cultivar is no longer available. Review its link before importing.",
          });
        }
      }

      const subscriptionResult =
        ctx._confirmedActiveMembership === undefined
          ? await getStripeSubscriptionResult(ctx.user.stripeCustomerId)
          : null;
      const hasPro =
        ctx._confirmedActiveMembership === true ||
        (subscriptionResult?.confirmed === true &&
          hasActiveSubscription(subscriptionResult.subscription.status));
      if (listRequests.size > 0 && !hasPro) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Upgrade to Pro to import lists. If you already have Pro, retry once membership is confirmed.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const existingListings = await tx.listing.findMany({
          where: { userId: ctx.user.id },
          select: {
            id: true,
            importKey: true,
            cultivarReferenceId: true,
            title: true,
            price: true,
            description: true,
            privateNote: true,
            slug: true,
          },
        });
        const listingsById = new Map(
          existingListings.map((row) => [row.id, row]),
        );
        const importedByKey = new Map(
          existingListings.flatMap((row) =>
            row.importKey ? [[row.importKey, row.id] as const] : [],
          ),
        );
        const receiptKey = (importKey: string) =>
          `catalog-import-row:${memberCreateId("listing", ctx.user.id, importKey)}`;
        const receipts = await tx.keyValue.findMany({
          where: { key: { in: rows.map((row) => receiptKey(row.importKey)) } },
          select: { key: true, value: true },
        });
        const receiptTargets = new Map(
          receipts.map((receipt) => [receipt.key, receipt.value]),
        );
        const existingLists = await tx.list.findMany({
          where: { userId: ctx.user.id },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            listings: { select: { id: true } },
          },
        });
        const listReceiptKeys = [...listRequests.values()].map(
          (request) =>
            `member-create:${memberCreateId("list", ctx.user.id, request.requestId)}`,
        );
        const listReceipts = await tx.keyValue.findMany({
          where: { key: { in: listReceiptKeys } },
          select: { key: true },
        });
        const priorListRequests = new Set(
          listReceipts.map((receipt) => receipt.key),
        );
        const listPlans = new Map<
          string,
          {
            id: string;
            title: string;
            requestId: string;
            existing: (typeof existingLists)[number] | undefined;
            ambiguous: boolean;
            listingIds: Set<string>;
          }
        >();
        for (const [name, request] of listRequests) {
          const matches = existingLists.filter(
            (list) => normalizeCatalogImportName(list.title) === name,
          );
          const id =
            matches[0]?.id ??
            memberCreateId("list", ctx.user.id, request.requestId);
          const renamed = existingLists.some(
            (list) =>
              list.id === id && normalizeCatalogImportName(list.title) !== name,
          );
          listPlans.set(name, {
            ...request,
            id,
            existing: matches.length === 1 ? matches[0] : undefined,
            ambiguous:
              matches.length > 1 ||
              renamed ||
              (matches.length === 0 &&
                priorListRequests.has(
                  `member-create:${memberCreateId("list", ctx.user.id, request.requestId)}`,
                )),
            listingIds: new Set(),
          });
        }

        const rowsToCreate: (z.infer<typeof importListingSchema> & {
          id: string;
          slug: string;
        })[] = [];
        const receiptsToCreate: { key: string; value: string }[] = [];
        const listingIds = new Set<string>();
        const reservedSlugs = new Set(existingListings.map((row) => row.slug));
        const skippedRows: {
          importKey: string;
          title: string;
          reason: "ambiguous-listing" | "ambiguous-list" | "deleted-listing";
        }[] = [];
        let reusedCount = 0;
        let alreadyImportedCount = 0;

        for (const row of rows) {
          if (
            row.lists.some(
              (title) =>
                listPlans.get(normalizeCatalogImportName(title))?.ambiguous,
            )
          ) {
            skippedRows.push({
              importKey: row.importKey,
              title: row.title,
              reason: "ambiguous-list",
            });
            continue;
          }
          const key = receiptKey(row.importKey);
          const previousId =
            receiptTargets.get(key) ?? importedByKey.get(row.importKey);
          let listingId: string;
          if (previousId) {
            if (!listingsById.has(previousId)) {
              skippedRows.push({
                importKey: row.importKey,
                title: row.title,
                reason: "deleted-listing",
              });
              continue;
            }
            listingId = previousId;
            alreadyImportedCount += 1;
          } else {
            const match = getCatalogImportExistingListingMatch(
              row,
              existingListings,
            );
            if (match.kind === "ambiguous") {
              skippedRows.push({
                importKey: row.importKey,
                title: row.title,
                reason: "ambiguous-listing",
              });
              continue;
            }
            if (match.kind === "duplicate") {
              listingId = match.listings[0]!.id;
              reusedCount += 1;
            } else {
              listingId = memberCreateId(
                "listing",
                ctx.user.id,
                `catalog-import:${row.importKey}`,
              );
              const created = {
                ...row,
                id: listingId,
                slug: reserveUniqueSlug(row.title, reservedSlugs),
              };
              rowsToCreate.push(created);
              existingListings.push(created);
              listingsById.set(listingId, created);
            }
          }
          if (!receiptTargets.has(key))
            receiptsToCreate.push({ key, value: listingId });
          listingIds.add(listingId);
          for (const title of row.lists) {
            listPlans
              .get(normalizeCatalogImportName(title))!
              .listingIds.add(listingId);
          }
        }

        if (
          rowsToCreate.length > 0 &&
          (ctx._confirmedActiveMembership === false ||
            (subscriptionResult?.confirmed === true &&
              !hasActiveSubscription(
                subscriptionResult.subscription.status,
              ))) &&
          existingListings.length > APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Upgrade to Pro to import this catalog.",
          });
        }
        if (rowsToCreate.length > 0) {
          await tx.listing.createMany({
            data: rowsToCreate.map((row) => ({
              id: row.id,
              userId: ctx.user.id,
              importKey: row.importKey,
              title: row.title,
              cultivarReferenceId: row.cultivarReferenceId,
              description: row.description,
              privateNote: row.privateNote,
              price: row.price,
              slug: row.slug,
            })),
          });
        }
        if (receiptsToCreate.length > 0) {
          await tx.keyValue.createMany({ data: receiptsToCreate });
        }

        const listIds: string[] = [];
        for (const plan of listPlans.values()) {
          if (plan.ambiguous || plan.listingIds.size === 0) continue;
          const connect = [...plan.listingIds].filter(
            (id) =>
              !plan.existing?.listings.some((listing) => listing.id === id),
          );
          if (plan.existing) {
            if (connect.length > 0) {
              await tx.list.update({
                where: { id: plan.existing.id, userId: ctx.user.id },
                data: {
                  listings: { connect: connect.map((id) => ({ id })) },
                  updatedAt: nextListingVersion(plan.existing.updatedAt),
                },
              });
            }
          } else {
            const fresh = await reserveMemberCreateRequest(
              tx,
              "list",
              ctx.user.id,
              plan.requestId,
              { title: normalizeCatalogImportName(plan.title) },
            );
            if (!fresh) {
              throw new TRPCError({
                code: "CONFLICT",
                message: `The imported list “${plan.title}” was renamed or deleted. Review its name before importing again.`,
              });
            }
            await tx.list.create({
              data: {
                id: plan.id,
                title: plan.title,
                userId: ctx.user.id,
                listings: { connect: connect.map((id) => ({ id })) },
              },
            });
          }
          listIds.push(plan.id);
        }

        return {
          createdCount: rowsToCreate.length,
          reusedCount,
          alreadyImportedCount,
          skippedCount: skippedRows.length,
          skippedRows,
          listingIds: [...listingIds],
          listIds,
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
        await tx.image.deleteMany({
          where: { listing: { id: input.id, userId: ctx.user.id } },
        });
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
