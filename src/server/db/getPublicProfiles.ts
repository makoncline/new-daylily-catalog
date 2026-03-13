"use server";

import { getCachedProUserIds } from "@/server/db/getCachedProUserIds";
import { getPublicSellerSummariesByUserIds } from "@/server/db/public-seller-data";

export async function getPublicCatalogCardsByUserIds(
  userIds: string[],
  options?: {
    activeUserIds?: readonly string[] | Set<string>;
  },
) {
  if (userIds.length === 0) {
    return [];
  }

  const summariesByUserId = await getPublicSellerSummariesByUserIds(userIds, {
    activeUserIds: options?.activeUserIds,
  });

  return Array.from(summariesByUserId.values())
    .filter((summary) => summary.listingCount > 0)
    .sort((a, b) => b.listingCount - a.listingCount);
}

export async function getPublicProfiles() {
  try {
    const proUserIds = await getCachedProUserIds();

    return getPublicCatalogCardsByUserIds(proUserIds, {
      activeUserIds: proUserIds,
    });
  } catch (error) {
    console.error("Error fetching public profiles:", error);
    throw new Error("Failed to fetch public profiles");
  }
}
