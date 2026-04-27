import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  ahsDisplayAhsListingSelect,
  v2AhsCultivarDisplaySelect,
  withResolvedDisplayAhsListing,
} from "@/lib/utils/ahs-display";

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

const imageSelect = {
  id: true,
  url: true,
  order: true,
  listingId: true,
  userProfileId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
} as const;

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

function getUniqueValues<T>(values: Array<T | null | undefined>) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is T => value !== null && value !== undefined,
      ),
    ),
  );
}

export const dashboardDbBootstrapRouter = createTRPCRouter({
  snapshot: protectedProcedure.query(async ({ ctx }) => {
    const [listings, lists, profile] = await Promise.all([
      ctx.db.listing.findMany({
        where: { userId: ctx.user.id },
        select: listingSelect,
        orderBy: { updatedAt: "asc" },
      }),
      ctx.db.list.findMany({
        where: { userId: ctx.user.id },
        select: listSelect,
        orderBy: { updatedAt: "asc" },
      }),
      ctx.db.userProfile.findUnique({
        where: { userId: ctx.user.id },
        select: { id: true },
      }),
    ]);

    const listingIds = listings.map((listing) => listing.id);
    const cultivarReferenceIds = getUniqueValues(
      listings.map((listing) => listing.cultivarReferenceId),
    );

    const [images, cultivarReferences] = await Promise.all([
      listingIds.length || profile
        ? ctx.db.image.findMany({
            where: {
              OR: [
                ...(listingIds.length
                  ? [{ listingId: { in: listingIds } }]
                  : []),
                ...(profile ? [{ userProfileId: profile.id }] : []),
              ],
            },
            select: imageSelect,
            orderBy: { updatedAt: "asc" },
          })
        : [],
      cultivarReferenceIds.length
        ? ctx.db.cultivarReference.findMany({
            where: { id: { in: cultivarReferenceIds } },
            select: cultivarReferenceSelect,
            orderBy: { updatedAt: "asc" },
          })
        : [],
    ]);

    return {
      listings,
      lists,
      images,
      cultivarReferences: cultivarReferences.map((row) =>
        withResolvedDisplayAhsListing(row),
      ),
    };
  }),
});
