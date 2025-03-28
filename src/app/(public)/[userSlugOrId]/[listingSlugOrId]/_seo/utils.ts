import { IMAGES } from "@/lib/constants/images";
import { METADATA_CONFIG } from "@/config/constants";
import { getOptimizedMetaImageUrl } from "@/lib/utils/cloudflareLoader";
import { formatAhsListingSummary } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

// Type definitions
export type Listing = NonNullable<RouterOutputs["public"]["getListing"]>;

// Optimal meta description length
const MIN_DESCRIPTION_LENGTH = 70;
const MAX_DESCRIPTION_LENGTH = 160;

// Simple utility functions without memoization
export function getProfileTitle(listing: Listing): string {
  return listing.user.profile?.title ?? METADATA_CONFIG.SITE_NAME;
}

export function getListingImageUrl(listing: Listing): string {
  const rawImageUrl = listing.images?.[0]?.url ?? IMAGES.DEFAULT_LISTING;
  return getOptimizedMetaImageUrl(rawImageUrl);
}

export function getListingName(listing: Listing): string {
  return listing.title ?? listing.ahsListing?.name ?? "Unnamed Daylily";
}

export function getListingPageUrl(listing: Listing, baseUrl: string): string {
  return `${baseUrl}/${listing.userId}/${listing.slug ?? listing.id}`;
}

export function getListingDescription(
  listing: Listing,
  profileTitle: string,
  listingName: string,
): string {
  // Start with user description if available
  let description = listing.description?.trim() ?? "";

  // Get AHS description
  const ahsDescription = formatAhsListingSummary(listing.ahsListing) ?? "";

  // If we have no description yet, create one with the listing name and seller
  if (!description) {
    description = `${listingName} daylily available from ${profileTitle}.`;
  }

  // Check if description is too short and we have AHS data to supplement
  if (description.length < MIN_DESCRIPTION_LENGTH && ahsDescription) {
    // Add AHS data to make description longer, but be mindful of maximum length
    const remainingSpace = MAX_DESCRIPTION_LENGTH - description.length - 1; // -1 for space
    if (remainingSpace > 20) {
      // Only add if we have reasonable space
      const truncatedAhs =
        ahsDescription.length > remainingSpace
          ? ahsDescription.substring(0, remainingSpace - 3) + "..."
          : ahsDescription;
      description = `${description} ${truncatedAhs}`;
    }
  }

  // If description is too long, truncate it
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    description = description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
  }

  // If still too short, add generic enhancement
  if (description.length < MIN_DESCRIPTION_LENGTH) {
    description += ` Explore our collection of premium daylilies for your garden.`;

    // Truncate again if needed
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      description =
        description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + "...";
    }
  }

  return description.trim();
}
