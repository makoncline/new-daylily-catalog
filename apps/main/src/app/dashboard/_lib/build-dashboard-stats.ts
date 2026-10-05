import { STATUS } from "@/config/constants";
import type { RouterOutputs } from "@/trpc/react";
import type { DashboardStats } from "@/types/dashboard-stats-types";
import { hasProfileContent } from "@/lib/profile-content";

type Listing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type List = RouterOutputs["dashboardDb"]["list"]["list"][number];
type Image = RouterOutputs["dashboardDb"]["image"]["list"][number];
type UserProfile = RouterOutputs["dashboardDb"]["userProfile"]["get"];

interface BuildDashboardStatsArgs {
  listings: Listing[];
  lists: List[];
  images: Image[];
  profile: UserProfile | null | undefined;
}

function isPublished(status: string | null) {
  return status === null || status !== STATUS.HIDDEN;
}

export function buildDashboardStats({
  listings,
  lists,
  images,
  profile,
}: BuildDashboardStatsArgs): DashboardStats {
  const listingIdsWithImages = new Set(
    images
      .filter((image) => Boolean(image.listingId))
      .map((image) => image.listingId),
  );

  const totalListings = listings.length;
  const publishedListings = listings.filter((listing) =>
    isPublished(listing.status),
  ).length;
  const listingsWithImages = listings.filter((listing) =>
    listingIdsWithImages.has(listing.id),
  ).length;
  const listingsWithAhs = listings.filter((listing) =>
    Boolean(listing.cultivarReferenceId),
  ).length;

  const listingsWithPrice = listings.filter(
    (listing) => listing.price !== null,
  );
  const averagePrice =
    listingsWithPrice.length > 0
      ? listingsWithPrice.reduce(
          (sum, listing) => sum + (listing.price ?? 0),
          0,
        ) / listingsWithPrice.length
      : 0;

  const totalLists = lists.length;
  const totalListingsInLists = lists.reduce(
    (sum, list) => sum + list.listings.length,
    0,
  );
  const averageListingsPerList =
    totalLists > 0 ? totalListingsInLists / totalLists : 0;

  const profileImageCount = images.filter(
    (image) => Boolean(image.userProfileId) || !image.listingId,
  ).length;
  const profileFields = [
    "hasProfileImage",
    "description",
    "content",
    "location",
  ] as const;
  const completedProfileFieldCount = [
    profileImageCount > 0,
    hasProfileContent(profile?.description),
    hasProfileContent(profile?.content),
    hasProfileContent(profile?.location),
  ].filter(Boolean).length;
  const profileCompletionPercentage =
    (completedProfileFieldCount / profileFields.length) * 100;

  return {
    totalListings,
    publishedListings,
    totalLists,
    listingStats: {
      withImages: listingsWithImages,
      withAhsData: listingsWithAhs,
      withPrice: listingsWithPrice.length,
      averagePrice,
      inLists: totalListingsInLists,
    },
    imageStats: {
      total: images.length,
    },
    profileStats: {
      completionPercentage: profileCompletionPercentage,
      missingFields: [
        profileImageCount === 0 && "hasProfileImage",
        !hasProfileContent(profile?.description) && "description",
        !hasProfileContent(profile?.content) && "content",
        !hasProfileContent(profile?.location) && "location",
      ].filter((field): field is (typeof profileFields)[number] =>
        Boolean(field),
      ),
    },
    listStats: {
      averageListingsPerList,
    },
  };
}
