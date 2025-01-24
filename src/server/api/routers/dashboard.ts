import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

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

export const dashboardRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalListings,
      totalLists,
      listingsWithImages,
      listingsWithAhs,
      averagePrice,
      totalImages,
      profile,
      listsWithCounts,
      profileImages,
    ] = await Promise.all([
      ctx.db.listing.count({
        where: { userId: ctx.user.id },
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
          ahsId: { not: null },
        },
      }),
      ctx.db.listing.aggregate({
        where: { userId: ctx.user.id },
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
            select: { listings: true },
          },
        },
      }),
      ctx.db.image.count({
        where: {
          userProfile: { userId: ctx.user.id },
        },
      }),
    ]);

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

    // Calculate average listings per list
    const totalListings2 = listsWithCounts.reduce(
      (acc, list) => acc + list._count.listings,
      0,
    );
    const averageListingsPerList =
      totalLists > 0 ? totalListings2 / totalLists : 0;

    return {
      totalListings,
      totalLists,
      listingStats: {
        withImages: listingsWithImages,
        withAhsData: listingsWithAhs,
        averagePrice: averagePrice._avg.price ?? 0,
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
});
