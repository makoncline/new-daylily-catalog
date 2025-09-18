import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const ahsProcedures = {
  // Return only AHS listings referenced by the current user's listings
  getAhsForUserListings: protectedProcedure.query(async ({ ctx }) => {
    const listingRefs = await ctx.db.listing.findMany({
      where: { userId: ctx.user.id, ahsId: { not: null } },
      select: { ahsId: true },
      distinct: ["ahsId"],
    });

    const ids = listingRefs
      .map((r) => r.ahsId)
      .filter((v): v is string => typeof v === "string");

    if (ids.length === 0) return [];

    return ctx.db.ahsListing.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        hybridizer: true,
        year: true,
        ahsImageUrl: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  // Batch fetch by ids; minimal fields for display
  getAhsByIds: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const unique = Array.from(new Set(input.ids));
      return ctx.db.ahsListing.findMany({
        where: { id: { in: unique } },
        select: {
          id: true,
          name: true,
          hybridizer: true,
          year: true,
          ahsImageUrl: true,
        },
      });
    }),

  // Minimal search for linking: return only id and name
  searchAhs: protectedProcedure
    .input(z.object({ query: z.string().min(3) }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.ahsListing.findMany({
        where: {
          name: {
            startsWith: input.query,
          },
        },
        select: {
          id: true,
          name: true,
        },
        take: 25,
        orderBy: { name: "asc" },
      });
      return results;
    }),
} as const;
