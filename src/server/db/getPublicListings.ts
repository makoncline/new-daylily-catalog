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
  return db.listing.findMany({
    take,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0, // Skip the cursor record when using cursor
    where: {
      userId,
      OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
    },
    select: listingSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
}

// Helper function to transform listings with AHS image fallback
function transformListings(listings: ListingWithRelations[]) {
  return listings.map((listing) => ({
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
}

// Get initial page data - optimized for fast first load
export async function getInitialListings(userSlugOrId: string) {
  try {
    const userId = await getUserIdFromSlugOrId(userSlugOrId);
    const items = await findUserListings(userId, undefined, 36);
    return transformListings(items);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching initial listings:", error.message);
    } else {
      console.error("Error fetching initial listings:", error);
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch initial listings",
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

    while (hasMore) {
      const batch = await findUserListings(userId, cursor, batchSize);

      if (batch.length < batchSize) {
        hasMore = false;
      }

      if (batch.length > 0) {
        cursor = batch[batch.length - 1]?.id;
      }

      allListings = [...allListings, ...batch];
    }

    return transformListings(allListings);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching all listings:", error.message);
    } else {
      console.error("Error fetching all listings:", error);
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch all listings",
    });
  }
}
