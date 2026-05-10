import { db } from "@/server/db";

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
