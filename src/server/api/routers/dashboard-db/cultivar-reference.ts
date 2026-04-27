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

async function getCultivarReferencesForUserListings(
  userId: string,
  db: PrismaClient,
  options: {
    since?: Date;
    direction: "asc" | "desc";
  },
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

  const cultivarReferenceIds = Array.from(
    new Set(
      listingRows.flatMap((row) =>
        row.cultivarReferenceId ? [row.cultivarReferenceId] : [],
      ),
    ),
  );

  if (!cultivarReferenceIds.length) {
    return [];
  }

  return db.cultivarReference.findMany({
    where: {
      id: { in: cultivarReferenceIds },
      ...(options.since ? { updatedAt: { gte: options.since } } : {}),
    },
    select: cultivarReferenceSelect,
    orderBy: { updatedAt: options.direction },
  });
}

export const dashboardDbCultivarReferenceRouter = createTRPCRouter({
  listForUserListings: protectedProcedure.query(async ({ ctx }) => {
    const rows = await getCultivarReferencesForUserListings(
      ctx.user.id,
      ctx.db,
      { direction: "desc" },
    );

    return rows.map((row) => withResolvedDisplayAhsListing(row));
  }),

  sync: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      const rows = await getCultivarReferencesForUserListings(
        ctx.user.id,
        ctx.db,
        { since, direction: "asc" },
      );

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
