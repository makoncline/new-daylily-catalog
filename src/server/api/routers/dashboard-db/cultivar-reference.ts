import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { PrismaClient } from "@prisma/client";
import {
  ahsDisplayAhsListingSelect,
  v2AhsCultivarDisplaySelect,
  withResolvedDisplayAhsListing,
} from "@/lib/utils/ahs-display";

const cultivarReferenceSelect = {
  id: true,
  normalizedName: true,
  updatedAt: true,
  ahsListing: {
    select: ahsDisplayAhsListingSelect,
  },
  v2AhsCultivar: {
    select: v2AhsCultivarDisplaySelect,
  },
} as const;

function toUniqueCultivarReferenceIds(
  rows: Array<{ cultivarReferenceId: string | null }>,
) {
  return Array.from(
    new Set(
      rows.flatMap((row) =>
        row.cultivarReferenceId ? [row.cultivarReferenceId] : [],
      ),
    ),
  );
}

async function getCultivarReferenceIdsForUserListings(
  userId: string,
  db: PrismaClient,
) {
  const listingRows = await db.listing.findMany({
    where: {
      userId,
      cultivarReferenceId: {
        not: null,
      },
    },
    select: {
      cultivarReferenceId: true,
    },
  });

  return toUniqueCultivarReferenceIds(listingRows);
}

export const dashboardDbCultivarReferenceRouter = createTRPCRouter({
  listForUserListings: protectedProcedure.query(async ({ ctx }) => {
    const cultivarReferenceIds = await getCultivarReferenceIdsForUserListings(
      ctx.user.id,
      ctx.db,
    );

    if (cultivarReferenceIds.length === 0) {
      return [];
    }

    const rows = await ctx.db.cultivarReference.findMany({
      where: {
        id: {
          in: cultivarReferenceIds,
        },
      },
      select: cultivarReferenceSelect,
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => withResolvedDisplayAhsListing(row));
  }),

  sync: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      const cultivarReferenceIds = await getCultivarReferenceIdsForUserListings(
        ctx.user.id,
        ctx.db,
      );

      if (cultivarReferenceIds.length === 0) {
        return [];
      }

      const rows = await ctx.db.cultivarReference.findMany({
        where: {
          id: {
            in: cultivarReferenceIds,
          },
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        select: cultivarReferenceSelect,
        orderBy: { updatedAt: "asc" },
      });

      return rows.map((row) => withResolvedDisplayAhsListing(row));
    }),

  getByIds: protectedProcedure
    .input(z.object({ ids: z.array(z.string().trim().min(1)).min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const unique = Array.from(new Set(input.ids));
      const rows = await ctx.db.cultivarReference.findMany({
        where: { id: { in: unique } },
        select: cultivarReferenceSelect,
      });

      return rows.map((row) => withResolvedDisplayAhsListing(row));
    }),
});
