import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const ahsListingSelect = {
  id: true,
  name: true,
  ahsImageUrl: true,
  hybridizer: true,
  year: true,
  scapeHeight: true,
  bloomSize: true,
  bloomSeason: true,
  form: true,
  ploidy: true,
  foliageType: true,
  bloomHabit: true,
  budcount: true,
  branches: true,
  sculpting: true,
  foliage: true,
  flower: true,
  fragrance: true,
  parentage: true,
  color: true,
} as const;

const cultivarReferenceSelect = {
  id: true,
  normalizedName: true,
  updatedAt: true,
  ahsListing: {
    select: ahsListingSelect,
  },
} as const;

export const dashboardDbCultivarReferenceRouter = createTRPCRouter({
  listForUserListings: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.cultivarReference.findMany({
      where: {
        listings: {
          some: {
            userId: ctx.user.id,
          },
        },
      },
      select: cultivarReferenceSelect,
      orderBy: { updatedAt: "desc" },
    });
  }),

  sync: protectedProcedure
    .input(z.object({ since: z.iso.datetime().nullable() }))
    .query(async ({ ctx, input }) => {
      const since = input.since ? new Date(input.since) : undefined;
      return ctx.db.cultivarReference.findMany({
        where: {
          listings: {
            some: {
              userId: ctx.user.id,
            },
          },
          ...(since ? { updatedAt: { gte: since } } : {}),
        },
        select: cultivarReferenceSelect,
        orderBy: { updatedAt: "asc" },
      });
    }),

  getByIds: protectedProcedure
    .input(z.object({ ids: z.array(z.string().trim().min(1)).min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const unique = Array.from(new Set(input.ids));
      return ctx.db.cultivarReference.findMany({
        where: { id: { in: unique } },
        select: cultivarReferenceSelect,
      });
    }),
});

