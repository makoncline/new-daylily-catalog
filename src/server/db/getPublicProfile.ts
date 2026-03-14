import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { isPublished } from "@/server/db/public-visibility/filters";
import {
  getPublicSellerContent,
  getPublicSellerListSummaries,
  getPublicSellerSummary,
} from "@/server/db/public-seller-data";

// Helper function to get userId from either slug or id
export async function getUserIdFromSlugOrId(slugOrId: string): Promise<string> {
  // First try to find by slug (case insensitive)
  const profile = await db.userProfile.findFirst({
    where: {
      slug: slugOrId.toLowerCase(),
    },
    select: { userId: true },
  });

  if (profile) {
    return profile.userId;
  }

  // If not found by slug, check if it's a valid user id
  const user = await db.user.findUnique({
    where: { id: slugOrId },
    select: { id: true },
  });

  if (user) {
    return user.id;
  }

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "User not found",
  });
}

// Helper function to get listing id from either slug or id
export async function getListingIdFromSlugOrId(
  slugOrId: string,
  userId: string,
): Promise<string> {
  // First try to find by slug (case insensitive)
  const listingBySlug = await db.listing.findFirst({
    where: {
      userId,
      slug: slugOrId.toLowerCase(),
      ...isPublished(),
    },
    select: { id: true },
  });

  if (listingBySlug) {
    return listingBySlug.id;
  }

  // If not found by slug, check if it's a valid listing id
  const listingById = await db.listing.findFirst({
    where: {
      id: slugOrId,
      userId,
      ...isPublished(),
    },
    select: { id: true },
  });

  if (listingById) {
    return listingById.id;
  }

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Listing not found",
  });
}

export async function getPublicProfile(userSlugOrId: string) {
  try {
    const userId = await getUserIdFromSlugOrId(userSlugOrId);
    const [summary, parsedContent, lists] = await Promise.all([
      getPublicSellerSummary(userId),
      getPublicSellerContent(userId),
      getPublicSellerListSummaries(userId),
    ]);

    return {
      id: summary.id,
      title: summary.title,
      slug: summary.slug,
      description: summary.description,
      content: parsedContent,
      location: summary.location,
      images: summary.images,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      listCount: summary.listCount,
      _count: {
        listings: summary.listingCount,
      },
      lists,
      hasActiveSubscription: summary.hasActiveSubscription,
    };
  } catch (error) {
    console.error("Error fetching public profile:", error);

    // Preserve TRPCError codes, especially NOT_FOUND
    if (error instanceof TRPCError) {
      throw error;
    }

    // For other errors, use INTERNAL_SERVER_ERROR
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch public profile",
    });
  }
}
