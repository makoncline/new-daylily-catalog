import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { PrismaClient } from "@prisma/client";
import {
  ahsDisplayAhsListingSelect,
  v2AhsCultivarDisplaySelect,
  withResolvedDisplayAhsListing,
} from "@/lib/utils/ahs-display";
import {
  dashboardSyncInputSchema,
  parseDashboardSyncSince,
} from "./dashboard-db-router-helpers";

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
    cursor?: {
      id: string;
    };
    limit?: number;
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
      id: {
        in: cultivarReferenceIds,
        ...(options.cursor ? { gt: options.cursor.id } : {}),
      },
      ...(options.since ? { updatedAt: { gte: options.since } } : {}),
    },
    select: cultivarReferenceSelect,
    orderBy: { id: options.direction },
    ...(options.limit ? { take: options.limit } : {}),
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
    .input(dashboardSyncInputSchema)
    .query(async ({ ctx, input }) => {
      const since = parseDashboardSyncSince(input.since);
      const rows = await getCultivarReferencesForUserListings(
        ctx.user.id,
        ctx.db,
        {
          since,
          direction: "asc",
          cursor: input.cursor
            ? {
                id: input.cursor.id,
              }
            : undefined,
          limit: input.limit,
        },
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
