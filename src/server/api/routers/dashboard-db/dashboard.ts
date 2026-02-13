import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { STATUS } from "@/config/constants";

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

function isPublished(status: string | null) {
  return status === null || status !== STATUS.HIDDEN;
}

function hasContent(content: string | null | undefined) {
  if (!content) return false;

  try {
    const parsed = JSON.parse(content) as EditorContent;
    if (!parsed.blocks || parsed.blocks.length === 0) return false;

    return parsed.blocks.some((block) => {
      return block.data.text && block.data.text.trim().length > 0;
    });
  } catch {
    return content.trim().length > 0;
  }
}

export const dashboardDbDashboardRouter = createTRPCRouter({
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
      ctx.db.listing.findMany({
        where: { userId: ctx.user.id },
        select: { status: true },
      }),
      ctx.db.list.count({
        where: { userId: ctx.user.id },
      }),
      ctx.db.listing.count({
        where: {
          userId: ctx.user.id,
          images: { some: {} },
        },
      }),
      ctx.db.listing.count({
        where: {
          userId: ctx.user.id,
          cultivarReferenceId: { not: null },
        },
      }),
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

    const totalPublishedListings = allListings.filter((listing) =>
      isPublished(listing.status),
    ).length;

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
        ].filter((field): field is (typeof profileFields)[number] => Boolean(field)),
      },
      listStats: {
        averageListingsPerList,
      },
    };
  }),
});

