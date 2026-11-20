import type { Prisma } from "@prisma/client";
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
  catalogImportListingKey,
  normalizeCatalogImportName,
} from "@/lib/catalog-import-existing-listings";
import { normalizeCatalogListNames } from "@/lib/catalog-importer";
import {
  CATALOG_IMPORT_BATCH_LIST_LIMIT,
  CATALOG_IMPORT_BATCH_SIZE,
  catalogImportCultivarIdSchema,
  catalogImportRowSchema,
} from "@/lib/catalog-import-rows";
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

const importIdentitySelect = {
  title: true,
  cultivarReferenceId: true,
} as const;

async function findImportCultivarIds(
  db: Prisma.TransactionClient,
  ids: string[],
) {
  const found: string[] = [];
  for (let offset = 0; offset < ids.length; offset += 400) {
    const references = await db.cultivarReference.findMany({
      where: { id: { in: ids.slice(offset, offset + 400) } },
      select: { id: true },
    });
    found.push(...references.map(({ id }) => id));
  }
  return found;
}

async function getImportListsByName(
  db: Prisma.TransactionClient,
  userId: string,
) {
  const lists = await db.list.findMany({
    where: { userId },
    select: { id: true, title: true },
  });
  const byName = new Map<string, (typeof lists)[number] | null>();
  for (const list of lists) {
    const name = normalizeCatalogImportName(list.title);
    byName.set(name, byName.has(name) ? null : list);
  }
  return byName;
}

async function writeImportListMemberships(
  tx: Prisma.TransactionClient,
  userId: string,
  rows: { id: string; lists: string[] }[],
) {
  if (rows.every((row) => row.lists.length === 0)) return;

  const existingLists = await getImportListsByName(tx, userId);
  const newLists = new Map<
    string,
    { id: string; title: string; userId: string }
  >();
  const touchedListIds = new Set<string>();
  const listingIdsByListId = new Map<string, string[]>();
  for (const row of rows) {
    for (const title of row.lists) {
      const name = normalizeCatalogImportName(title);
      const existing = existingLists.get(name);
      if (existing === null) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `More than one list is named “${title}”. Upload the file again to check its lists.`,
        });
      }
      const listId =
        existing?.id ?? newLists.get(name)?.id ?? crypto.randomUUID();
      if (existing) touchedListIds.add(listId);
      else if (!newLists.has(name))
        newLists.set(name, { id: listId, title, userId });
      const listingIds = listingIdsByListId.get(listId) ?? [];
      listingIds.push(row.id);
      listingIdsByListId.set(listId, listingIds);
    }
  }
  if (newLists.size) await tx.list.createMany({ data: [...newLists.values()] });
  await tx.$executeRaw`
    INSERT INTO "_ListToListing" ("A", "B")
    SELECT lists.key, listings.value
    FROM json_each(${JSON.stringify(Object.fromEntries(listingIdsByListId))}) AS lists
    CROSS JOIN json_each(lists.value) AS listings
  `;
  if (touchedListIds.size) {
    await tx.$executeRaw`
      UPDATE "List"
      SET "updatedAt" = MAX("updatedAt" + 1, ${Date.now()})
      WHERE "userId" = ${userId} AND "id" IN (SELECT value FROM json_each(${JSON.stringify([...touchedListIds])}))
    `;
  }
}

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
  readImportPreview: protectedProcedure
    .input(
      z.object({
        cultivarReferenceIds: z.array(catalogImportCultivarIdSchema).max(5_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existingListings, cultivarReferenceIds, listsByName] =
        await Promise.all([
          ctx.db.listing.findMany({
            where: { userId: ctx.user.id },
            select: importIdentitySelect,
          }),
          findImportCultivarIds(ctx.db, [
            ...new Set(input.cultivarReferenceIds),
          ]),
          getImportListsByName(ctx.db, ctx.user.id),
        ]);
      return {
        existingListings,
        cultivarReferenceIds,
        ambiguousListNames: [...listsByName]
          .filter(([, list]) => list === null)
          .map(([name]) => name),
      };
    }),

  importRows: protectedProcedure
    .input(
      z.object({
        rows: z
          .array(catalogImportRowSchema)
          .min(1)
          .max(CATALOG_IMPORT_BATCH_SIZE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rows = input.rows.map((row) => ({
        ...row,
        lists: normalizeCatalogListNames(row.lists),
      }));
      const listNames = new Set(
        rows.flatMap((row) => row.lists.map(normalizeCatalogImportName)),
      );
      if (listNames.size > CATALOG_IMPORT_BATCH_LIST_LIMIT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Import at most 100 lists at a time.",
        });
      }

      const subscriptionResult =
        ctx._confirmedActiveMembership === undefined
          ? await getStripeSubscriptionResult(ctx.user.stripeCustomerId)
          : null;
      const hasPro =
        ctx._confirmedActiveMembership === true ||
        (subscriptionResult?.confirmed === true &&
          hasActiveSubscription(subscriptionResult.subscription.status));
      if (listNames.size > 0 && !hasPro) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Upgrade to Pro to import lists. If you already have Pro, retry once membership is confirmed.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const userId = ctx.user.id;
        const existingListings = await tx.listing.findMany({
          where: { userId },
          select: { ...importIdentitySelect, slug: true },
        });
        const keys = new Set(existingListings.map(catalogImportListingKey));
        const reservedSlugs = new Set(existingListings.map(({ slug }) => slug));
        const skippedNames: string[] = [];
        const rowsToCreate = [];
        for (const row of rows) {
          const key = catalogImportListingKey(row);
          if (keys.has(key)) {
            skippedNames.push(row.title);
          } else {
            keys.add(key);
            rowsToCreate.push({
              ...row,
              id: crypto.randomUUID(),
              slug: reserveUniqueSlug(row.title, reservedSlugs),
            });
          }
        }
        if (rowsToCreate.length === 0) return { createdCount: 0, skippedNames };

        if (
          (ctx._confirmedActiveMembership === false ||
            subscriptionResult?.confirmed) &&
          !hasPro &&
          existingListings.length + rowsToCreate.length >
            APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Upgrade to Pro to import this catalog.",
          });
        }

        const cultivarIds = [
          ...new Set(
            rowsToCreate.flatMap(({ cultivarReferenceId }) =>
              cultivarReferenceId === null ? [] : [cultivarReferenceId],
            ),
          ),
        ];
        if (
          (await findImportCultivarIds(tx, cultivarIds)).length !==
          cultivarIds.length
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "A linked cultivar is no longer available. Upload the file again to check its links.",
          });
        }

        await tx.listing.createMany({
          data: rowsToCreate.map(({ lists: _lists, ...row }) => ({
            ...row,
            userId,
          })),
        });
        await writeImportListMemberships(tx, userId, rowsToCreate);
        return { createdCount: rowsToCreate.length, skippedNames };
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
