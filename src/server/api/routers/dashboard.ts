import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { STATUS } from "@/config/constants";
import {
  getAhsListings,
  getBaseListings,
  getUserImages,
  getListsAndEntries,
  getUserAhsIds,
  getListing,
} from "@/server/db/user-data";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

interface EditorBlock {
  id: string;
  type: string;
  data: {
    text?: string;
    level?: number;
  };
}

interface EditorContent {
  time: number;
  blocks?: EditorBlock[];
  version: string;
}

// Helper to check if a listing is published
const isPublished = (status: string | null) => {
  return status === null || status !== STATUS.HIDDEN;
};

export const dashboardRouter = createTRPCRouter({
  getBaseListings: protectedProcedure.query(async ({ ctx }) => {
    return getBaseListings(ctx.user.id, true);
  }),
  getUserImages: protectedProcedure.query(async ({ ctx }) => {
    return getUserImages(ctx.user.id, true);
  }),
  getListsAndEntries: protectedProcedure.query(async ({ ctx }) => {
    return getListsAndEntries(ctx.user.id, true);
  }),
  getAhsListings: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const ahsIds = await getUserAhsIds(userId);
    const ahsListings = await getAhsListings(ahsIds);
    return ahsListings;
  }),
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [
      allListings,
      totalLists,
      listingsWithImages,
      listingsWithAhs,
      priceStats,
      totalImages,
      profile,
      listsWithCounts,
      profileImages,
    ] = await Promise.all([
      // Get all listings to calculate published count
      ctx.db.listing.findMany({
        where: { userId: ctx.user.id },
        select: { status: true },
      }),
      ctx.db.list.count({
        where: { userId: ctx.user.id },
      }),
      // Count listings with images
      ctx.db.listing.count({
        where: {
          userId: ctx.user.id,
          images: { some: {} },
        },
      }),
      // Count listings with AHS data
      ctx.db.listing.count({
        where: {
          userId: ctx.user.id,
          ahsId: { not: null },
        },
      }),
      // Calculate price stats (only for listings with non-null prices)
      ctx.db.listing.aggregate({
        where: {
          userId: ctx.user.id,
          price: { not: null },
        },
        _count: true,
        _avg: {
          price: true,
        },
      }),
      ctx.db.image.count({
        where: {
          OR: [
            { listing: { userId: ctx.user.id } },
            { userProfile: { userId: ctx.user.id } },
          ],
        },
      }),
      ctx.db.userProfile.findUnique({
        where: { userId: ctx.user.id },
        select: {
          description: true,
          content: true,
          location: true,
        },
      }),
      // Get lists with counts of listings
      ctx.db.list.findMany({
        where: { userId: ctx.user.id },
        include: {
          _count: {
            select: {
              listings: true,
            },
          },
        },
      }),
      ctx.db.image.count({
        where: {
          userProfile: { userId: ctx.user.id },
        },
      }),
    ]);

    // Calculate total published listings
    const totalPublishedListings = allListings.filter((listing) =>
      isPublished(listing.status),
    ).length;

    // Helper to check if content exists and has length
    const hasContent = (content: string | null | undefined) => {
      if (!content) return false;

      // For JSON content (like bio), check if it has blocks with text
      try {
        const parsed = JSON.parse(content) as EditorContent;
        // Check if we have blocks array and it's not empty
        if (!parsed.blocks || parsed.blocks.length === 0) return false;

        // Check if any block has text content in its data
        const hasText = parsed.blocks.some((block) => {
          return block.data.text && block.data.text.trim().length > 0;
        });

        return hasText;
      } catch {
        // For plain text content
        const hasText = content.trim().length > 0;
        return hasText;
      }
    };

    // Calculate profile completion percentage
    const profileFields = [
      "hasProfileImage",
      "description",
      "content",
      "location",
    ] as const;
    const completedFields = [
      profileImages > 0,
      hasContent(profile?.description),
      hasContent(profile?.content),
      hasContent(profile?.location),
    ].filter(Boolean).length;
    const profileCompletion = (completedFields / profileFields.length) * 100;

    // Calculate average listings per list and total listings in lists
    const totalListingsInLists = listsWithCounts.reduce(
      (acc, list) => acc + list._count.listings,
      0,
    );
    const averageListingsPerList =
      totalLists > 0 ? totalListingsInLists / totalLists : 0;

    return {
      totalListings: allListings.length,
      publishedListings: totalPublishedListings,
      totalLists,
      listingStats: {
        withImages: listingsWithImages,
        withAhsData: listingsWithAhs,
        withPrice: priceStats._count,
        averagePrice: priceStats._avg.price ?? 0,
        inLists: totalListingsInLists,
      },
      imageStats: {
        total: totalImages,
      },
      profileStats: {
        completionPercentage: profileCompletion,
        missingFields: [
          !profileImages && "hasProfileImage",
          !hasContent(profile?.description) && "description",
          !hasContent(profile?.content) && "content",
          !hasContent(profile?.location) && "location",
        ].filter((field): field is (typeof profileFields)[number] =>
          Boolean(field),
        ),
      },
      listStats: {
        averageListingsPerList,
      },
    };
  }),
  getSingleListing: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // The user is already available in the context because of protectedProcedure
      const userId = ctx.user.id;

      // Get the specified listing with full details
      const listing = await getListing(input.id, true); // true = isOwner

      // Check if this listing belongs to the current user
      if (listing && listing.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this listing",
        });
      }

      return listing;
    }),
});
