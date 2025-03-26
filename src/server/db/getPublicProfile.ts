import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { type OutputData } from "@editorjs/editorjs";
import {
  DEFAULT_SUB_DATA,
  getStripeSubscription,
  type StripeSubCache,
} from "@/server/stripe/sync-subscription";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";

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
    },
    select: { id: true },
  });

  if (listingBySlug) {
    return listingBySlug.id;
  }

  // If not found by slug, check if it's a valid listing id
  const listingById = await db.listing.findUnique({
    where: {
      id: slugOrId,
      userId,
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
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeCustomerId: true,
        createdAt: true,
        profile: {
          select: {
            title: true,
            slug: true,
            description: true,
            content: true,
            location: true,
            updatedAt: true,
            images: {
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
                url: true,
              },
            },
          },
        },
        _count: {
          select: {
            listings: true,
          },
        },
        lists: {
          select: {
            id: true,
            title: true,
            description: true,
            _count: {
              select: {
                listings: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    let sub: StripeSubCache = DEFAULT_SUB_DATA;
    try {
      sub = await getStripeSubscription(user.stripeCustomerId);
    } catch (error) {
      console.error(
        "Error fetching stripe subscription for user:",
        user.id,
        " ",
        error,
      );
    }

    // Parse content if it exists
    let parsedContent = null;
    if (user.profile?.content) {
      try {
        parsedContent = JSON.parse(user.profile.content) as OutputData;
      } catch (error) {
        console.error("Error parsing profile content:", error);
        parsedContent = user.profile.content;
      }
    }

    return {
      id: user.id,
      title: user.profile?.title ?? null,
      slug: user.profile?.slug ?? null,
      description: user.profile?.description ?? null,
      content: parsedContent,
      location: user.profile?.location ?? null,
      images: user.profile?.images ?? [],
      createdAt: user.createdAt,
      updatedAt: user.profile?.updatedAt ?? user.createdAt,
      _count: {
        listings: user._count.listings,
      },
      lists: user.lists.map((list) => ({
        id: list.id,
        title: list.title,
        description: list.description ?? null,
        listingCount: list._count.listings,
      })),
      hasActiveSubscription: hasActiveSubscription(sub.status),
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
