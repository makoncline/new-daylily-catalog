import {
  getProfileTitle,
  getListingImageUrl,
  getListingName,
  getListingPageUrl,
  getListingDescription,
  type Listing,
} from "./utils";
import { unstable_cache } from "next/cache";
import { normalizeError, reportError } from "@/lib/error-utils";

// Type definitions
export interface ListingMetadata {
  url: string;
  profileTitle: string;
  imageUrl: string;
  listingName: string;
  pageUrl: string;
  title: string;
  description: string;
}

// Base function for generating metadata
async function createListingMetadata(
  listing: Listing,
  url: string,
): Promise<ListingMetadata> {
  try {
    const profileTitle = getProfileTitle(listing);
    const imageUrl = getListingImageUrl(listing);
    const listingName = getListingName(listing);
    const pageUrl = getListingPageUrl(listing, url);
    const title = `${listingName} Daylily | ${profileTitle}`;
    const description = getListingDescription(
      listing,
      profileTitle,
      listingName,
    );

    return {
      url,
      profileTitle,
      imageUrl,
      listingName,
      pageUrl,
      title,
      description,
    };
  } catch (error) {
    reportError({
      error: normalizeError(error),
      context: {
        listing: { id: listing.id },
        url,
        source: "createListingMetadata",
      },
    });

    // Fallback values
    return {
      url,
      profileTitle: "Daylily Catalog",
      imageUrl: "/images/default-daylily.jpg",
      listingName: "Daylily",
      pageUrl: `${url}/${listing.userId}/${listing.id}`,
      title: "Daylily | Daylily Catalog",
      description: "View this daylily from our catalog",
    };
  }
}

// Create a higher-order function that creates a cached function for each listing ID
export function generateListingMetadata(
  listing: Listing,
  url: string,
): Promise<ListingMetadata> {
  // Use the unstable_cache with only time-based expiration
  return unstable_cache(
    async () => createListingMetadata(listing, url),
    [`metadata-${listing.id}`], // Cache key specific to this listing
    {
      revalidate: 3600, // Match page revalidation setting
    },
  )();
}
