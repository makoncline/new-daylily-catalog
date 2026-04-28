import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

/**
 * Maps a legacy listing ID to owner information including slugs when available
 * Used for redirecting /catalog/{listingId} to /{userSlug}/{listingSlug}
 */
export async function getListingOwnerWithSlugs(listingId: string): Promise<{
  userId: string;
  userSlug: string | null;
  listingSlug: string | null;
} | null> {
  try {
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: {
        userId: true,
        slug: true,
        user: {
          select: {
            profile: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!listing) return null;

    return {
      userId: listing.userId,
      userSlug: listing.user.profile?.slug ?? null,
      listingSlug: listing.slug ?? null,
    };
  } catch (error) {
    console.error("Error mapping listing to owner:", error);
    return null;
  }
}

/**
 * Maps a legacy listing ID to a user ID
 * Used for redirecting /catalog/{listingId} to /{userId}/{listingId}
 */
export async function getListingOwner(
  listingId: string,
): Promise<string | null> {
  try {
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { userId: true },
    });

    return listing?.userId ?? null;
  } catch (error) {
    console.error("Error mapping listing to owner:", error);
    return null;
  }
}

/**
 * Get all listings with their user IDs
 * Used for generating static redirects if needed
 */
export async function getAllListingToUserMappings() {
  try {
    const listings = await db.listing.findMany({
      select: { id: true, userId: true },
    });

    return listings.map((listing) => ({
      listingId: listing.id,
      userId: listing.userId,
    }));
  } catch (error) {
    console.error("Error getting all listing-user mappings:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get listing-user mappings",
    });
  }
}
