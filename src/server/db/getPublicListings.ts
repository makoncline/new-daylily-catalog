import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { STATUS } from "@/config/constants";
import { getUserIdFromSlugOrId } from "./getPublicProfile";

const listingSelect = {
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
    select: {
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

type ListingWithRelations = Awaited<
  ReturnType<typeof findUserListings>
>[number];

// Helper function to find listings with cursor-based pagination
async function findUserListings(
  userId: string,
  cursor?: string,
  take?: number,
) {
  const listings = await db.listing.findMany({
    take,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    where: {
      userId,
      OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
    },
    select: listingSelect,
    orderBy: {
      createdAt: "desc",
    },
  });

  return listings;
}

// Helper function to transform listings with AHS image fallback
function transformListings(listings: ListingWithRelations[]) {
  const transformed = listings.map((listing) => ({
    ...listing,
    images:
      listing.images.length === 0 && listing.ahsListing?.ahsImageUrl
        ? [
            {
              id: `ahs-${listing.id}`,
              url: listing.ahsListing.ahsImageUrl,
            },
          ]
        : listing.images,
  }));

  return transformed;
}

// Get initial page data - optimized for fast first load
export async function getInitialListings(userSlugOrId: string) {
  try {
    const userId = await getUserIdFromSlugOrId(userSlugOrId);
    const items = await findUserListings(userId, undefined, 36);
    return transformListings(items);
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch initial listings",
      cause: error,
    });
  }
}

// Get all listings - uses cursor-based pagination in batches
export async function getPublicListings(userSlugOrId: string) {
  try {
    const userId = await getUserIdFromSlugOrId(userSlugOrId);
    let allListings: ListingWithRelations[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    const batchSize = 100;
    let batchNumber = 0;

    while (hasMore) {
      batchNumber++;
      const batch = await findUserListings(userId, cursor, batchSize);

      if (batch.length < batchSize) {
        hasMore = false;
      }

      if (batch.length > 0) {
        const lastItem = batch[batch.length - 1];
        if (lastItem) {
          cursor = lastItem.id;
        }
      }

      allListings = [...allListings, ...batch];
    }

    return transformListings(allListings);
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch all listings",
      cause: error,
    });
  }
}
