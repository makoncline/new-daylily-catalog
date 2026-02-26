import { STATUS } from "@/config/constants";
import type { RouterOutputs } from "@/trpc/react";
import type { DashboardStats } from "@/types/dashboard-stats-types";

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

function hasContent(content: string | null | undefined) {
  if (!content) return false;

  try {
    const parsed = JSON.parse(content) as EditorContent;
    if (!parsed.blocks || parsed.blocks.length === 0) return false;

    return parsed.blocks.some((block) => {
      return Boolean(block.data.text && block.data.text.trim().length > 0);
    });
  } catch {
    return content.trim().length > 0;
  }
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

  const listingsWithPrice = listings.filter((listing) => listing.price !== null);
  const averagePrice =
    listingsWithPrice.length > 0
      ? listingsWithPrice.reduce((sum, listing) => sum + (listing.price ?? 0), 0) /
        listingsWithPrice.length
      : 0;

  const totalLists = lists.length;
  const totalListingsInLists = lists.reduce(
    (sum, list) => sum + list.listings.length,
    0,
  );
  const averageListingsPerList =
    totalLists > 0 ? totalListingsInLists / totalLists : 0;

  const profileImageCount = images.filter((image) =>
    Boolean(image.userProfileId),
  ).length;
  const profileFields = [
    "hasProfileImage",
    "description",
    "content",
    "location",
  ] as const;
  const completedProfileFieldCount = [
    profileImageCount > 0,
    hasContent(profile?.description),
    hasContent(profile?.content),
    hasContent(profile?.location),
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
        !hasContent(profile?.description) && "description",
        !hasContent(profile?.content) && "content",
        !hasContent(profile?.location) && "location",
      ].filter((field): field is (typeof profileFields)[number] => Boolean(field)),
    },
    listStats: {
      averageListingsPerList,
    },
  };
}
