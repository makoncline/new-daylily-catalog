import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { getPublicProfiles } from "@/server/db/getPublicProfiles";
import { getPublicProfile } from "@/server/db/getPublicProfile";
import { getPublicListings } from "@/server/db/getPublicListings";

// Helper function to get userId from either slug or id
async function getUserIdFromSlugOrId(slugOrId: string): Promise<string> {
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
async function getListingIdFromSlugOrId(
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

// Helper function to get the full listing data with all relations
async function getFullListingData(listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: listingSelect,
  });

  if (!listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Listing not found",
    });
  }

  // Transform the listing to include AHS image if available
  return {
    ...listing,
    userSlug: listing.user.profile?.slug ?? listing.userId,
    images:
      listing.images.length === 0 && listing.ahsListing?.ahsImageUrl
        ? [
            {
              id: `ahs-${listing.id}`,
              url: listing.ahsListing.ahsImageUrl,
            },
          ]
        : listing.images,
  };
}

export const publicRouter = createTRPCRouter({
  getPublicProfiles: publicProcedure.query(async () => {
    try {
      return await getPublicProfiles();
    } catch (error) {
      console.error("TRPC Error fetching public profiles:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch public profiles",
      });
    }
  }),

  getProfile: publicProcedure
    .input(z.object({ userSlugOrId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getPublicProfile(input.userSlugOrId);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching public profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch public profile",
        });
      }
    }),

  getListings: publicProcedure
    .input(
      z.object({
        userSlugOrId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        return await getPublicListings(input.userSlugOrId);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching public listings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch public listings",
        });
      }
    }),

  getListingById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getFullListingData(input.id);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching listing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch listing",
        });
      }
    }),

  getListing: publicProcedure
    .input(
      z.object({
        userSlugOrId: z.string(),
        listingSlugOrId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const userId = await getUserIdFromSlugOrId(input.userSlugOrId);
        const listingId = await getListingIdFromSlugOrId(
          input.listingSlugOrId,
          userId,
        );

        return await getFullListingData(listingId);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching listing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch listing",
        });
      }
    }),
});
