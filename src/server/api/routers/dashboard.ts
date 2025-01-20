import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

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
          intro: true,
          bio: true,
          userLocation: true,
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

    // Calculate profile completion percentage
    const profileFields = [
      "hasProfileImage",
      "intro",
      "bio",
      "userLocation",
    ] as const;
    const completedFields = [
      profileImages > 0,
      profile?.intro != null,
      profile?.bio != null,
      profile?.userLocation != null,
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
          !profile?.intro && "intro",
          !profile?.bio && "bio",
          !profile?.userLocation && "userLocation",
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
