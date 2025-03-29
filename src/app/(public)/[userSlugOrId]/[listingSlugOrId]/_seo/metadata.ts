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
import { METADATA_CONFIG } from "@/config/constants";

// Base function for generating metadata
async function createListingMetadata(listing: Listing | null, url: string) {
  // Handle null listing case
  if (!listing) {
    return {
      url,
      profileTitle: "Daylily Catalog",
      imageUrl: "/images/default-daylily.jpg",
      listingName: "Listing Not Found",
      pageUrl: url,
      title: "Listing Not Found",
      description: "The daylily listing you are looking for does not exist.",
      openGraph: {
        title: "Listing Not Found",
        description: "The daylily listing you are looking for does not exist.",
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
      },
    };
  }

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
      openGraph: {
        title,
        description,
        url: pageUrl,
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: "Daylily listing image",
          },
        ],
        type: "website",
      },
      twitter: {
        card: METADATA_CONFIG.TWITTER_CARD_TYPE,
        title,
        description,
        site: METADATA_CONFIG.TWITTER_HANDLE,
        images: [imageUrl],
      },
      alternates: {
        canonical: `/${listing.userId}/${listing.id}`,
      },
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
      openGraph: {
        title: "Daylily | Daylily Catalog",
        description: "View this daylily from our catalog",
        siteName: METADATA_CONFIG.SITE_NAME,
        locale: METADATA_CONFIG.LOCALE,
      },
    };
  }
}

// Create a higher-order function that creates a cached function for each listing ID
export function generateListingMetadata(listing: Listing | null, url: string) {
  // Use the unstable_cache with only time-based expiration
  return unstable_cache(
    async () => createListingMetadata(listing, url),
    [`metadata-${listing?.id ?? "not-found"}`], // Cache key specific to this listing
    {
      revalidate: 3600, // Match page revalidation setting
    },
  )();
}
