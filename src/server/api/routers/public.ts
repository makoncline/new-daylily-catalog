import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { getPublicProfiles } from "@/server/db/getPublicProfiles";
import {
  getListingIdFromSlugOrId,
  getPublicProfile,
  getUserIdFromSlugOrId,
} from "@/server/db/getPublicProfile";
import { unstable_cache } from "next/cache";
import { getListings, listingSelect } from "@/server/db/getPublicListings";

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

// Helper function to transform listings with AHS image fallback
function transformListings(
  listings: Awaited<
    ReturnType<typeof db.listing.findMany<{ select: typeof listingSelect }>>
  >,
) {
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

const getListingsCached = (userId: string) =>
  unstable_cache(getListings, [], {
    revalidate: 3600,
    tags: [`listings-${userId}`],
  });

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
        limit: z.number().min(1).default(36),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const userId = await getUserIdFromSlugOrId(input.userSlugOrId);
        const items = await getListingsCached(userId)({
          userId,
          limit: input.limit,
          cursor: input.cursor,
        });

        return transformListings(items);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch public listings",
          cause: error,
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
