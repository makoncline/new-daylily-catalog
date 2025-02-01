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

async function findUserListings(userId: string, cursor?: string) {
  return db.listing.findMany({
    take: 100,
    where: {
      userId,
      OR: [{ status: null }, { NOT: { status: STATUS.HIDDEN } }],
    },
    cursor: cursor ? { id: cursor } : undefined,
    select: listingSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPublicListings(userSlugOrId: string) {
  try {
    const userId = await getUserIdFromSlugOrId(userSlugOrId);
    let allListings: ListingWithRelations[] = [];
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore) {
      const batch = await findUserListings(userId, cursor);

      if (batch.length < 100) {
        hasMore = false;
      } else if (batch.length > 0) {
        const lastListing = batch[batch.length - 1];
        cursor = lastListing?.id;
      }

      allListings = [...allListings, ...batch];
    }

    // Deduplicate listings by ID
    const uniqueListings = Array.from(
      new Map(allListings.map((listing) => [listing.id, listing])).values(),
    );

    return uniqueListings.map((listing) => ({
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
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching public listings:", error.message);
    } else {
      console.error("Error fetching public listings:", error);
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch public listings",
    });
  }
}
