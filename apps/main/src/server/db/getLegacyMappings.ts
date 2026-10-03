import { publicDb } from "@/server/db";

export async function getListingOwnerWithSlugs(listingId: string): Promise<{
  userId: string;
  userSlug: string | null;
  listingSlug: string | null;
} | null> {
  const listing = await publicDb.listing.findUnique({
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

  if (!listing) {
    return null;
  }

  return {
    userId: listing.userId,
    userSlug: listing.user.profile?.slug ?? null,
    listingSlug: listing.slug ?? null,
  };
}
