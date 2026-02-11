import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { STATUS } from "@/config/constants";
import { getUserIdFromSlugOrId } from "./getPublicProfile";
import { getDisplayAhsListing } from "@/lib/utils/ahs-display";

const ahsListingSelect = {
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

export const listingSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  price: true,
  userId: true,
  user: {
    select: {
      profile: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
  },
  lists: {
    select: {
      id: true,
      title: true,
    },
  },
  ahsListing: {
    select: ahsListingSelect,
  },
  cultivarReference: {
    select: {
      ahsListing: {
        select: ahsListingSelect,
      },
    },
  },
  images: {
    select: {
      id: true,
      url: true,
    },
    orderBy: {
      order: "asc",
    },
  },
} as const;

type ListingWithRelations = Awaited<ReturnType<typeof getListings>>[number];

interface GetListingsArgs {
  userId: string;
  limit: number;
  cursor?: string;
}

export async function getListings(args: GetListingsArgs) {
  return db.listing.findMany({
    take: args.limit + 1,
    cursor: args.cursor ? { id: args.cursor } : undefined,
    skip: args.cursor ? 1 : 0,
    where: {
      userId: args.userId,
      OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
    },
    select: listingSelect,
    orderBy: {
      title: "asc",
    },
  });
}

// Helper function to transform listings with AHS image fallback
export function transformListings(listings: ListingWithRelations[]) {
  const transformed = listings.map((listing) => {
    const displayAhsListing = getDisplayAhsListing(listing);

    return {
      ...listing,
      ahsListing: displayAhsListing,
      images:
        listing.images.length === 0 && displayAhsListing?.ahsImageUrl
          ? [
              {
                id: `ahs-${listing.id}`,
                url: displayAhsListing.ahsImageUrl,
              },
            ]
          : listing.images,
    };
  });

  return transformed;
}

// Get initial page data - optimized for fast first load
export async function getInitialListings(userSlugOrId: string) {
  try {
    const userId = await getUserIdFromSlugOrId(userSlugOrId);
    const items = await getListings({ userId, limit: 36 });

    return transformListings(items);
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch initial listings",
      cause: error,
    });
  }
}
