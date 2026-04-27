import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import type { Prisma, PrismaClient } from "@prisma/client";
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

type CultivarReferenceRow = Prisma.CultivarReferenceGetPayload<{
  select: typeof cultivarReferenceSelect;
}>;

function sortCultivarReferenceRows(
  rows: CultivarReferenceRow[],
  direction: "asc" | "desc",
) {
  return [...rows].sort((a, b) => {
    const diff = a.updatedAt.getTime() - b.updatedAt.getTime();
    return direction === "asc" ? diff : -diff;
  });
}

async function getCultivarReferencesForUserListings(
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
      cultivarReference: {
        select: cultivarReferenceSelect,
      },
    },
  });

  const seen = new Set<string>();

  return listingRows.flatMap((row) => {
    const cultivarReference = row.cultivarReference;
    if (!cultivarReference || seen.has(cultivarReference.id)) {
      return [];
    }

    seen.add(cultivarReference.id);
    return [cultivarReference];
  });
}

export const dashboardDbCultivarReferenceRouter = createTRPCRouter({
  listForUserListings: protectedProcedure.query(async ({ ctx }) => {
    const rows = await getCultivarReferencesForUserListings(
      ctx.user.id,
      ctx.db,
    );

    return sortCultivarReferenceRows(rows, "desc").map((row) =>
      withResolvedDisplayAhsListing(row),
    );
  }),

  sync: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      const rows = await getCultivarReferencesForUserListings(
        ctx.user.id,
        ctx.db,
      );

      return sortCultivarReferenceRows(
        since ? rows.filter((row) => row.updatedAt >= since) : rows,
        "asc",
      ).map((row) => withResolvedDisplayAhsListing(row));
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
