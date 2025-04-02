import type { RouterOutputs } from "@/trpc/react";
import type {
  BaseListingScalars,
  AhsListingData,
  FullImage,
  ListWithListingIds,
} from "@/server/db/user-data";

// Define types for the specific API responses we'll work with
export type SingleListingOutput =
  RouterOutputs["dashboard"]["getSingleListing"];
export type ListingOutput = RouterOutputs["listing"]["update"];

/**
 * Extracts just the base scalar fields from a listing
 */
export function extractBaseListingFields(
  listing: SingleListingOutput | ListingOutput,
): BaseListingScalars | null {
  if (!listing) return null;

  return {
    id: listing.id,
    userId: listing.userId,
    title: listing.title,
    slug: listing.slug,
    price: listing.price,
    description: listing.description,
    ahsId: listing.ahsId,
    status: listing.status,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    privateNote: listing.privateNote ?? null,
  };
}

/**
 * Extracts AHS listing data if present
 */
export function extractAhsListingData(
  listing: SingleListingOutput | ListingOutput,
): AhsListingData | null {
  return listing?.ahsListing ?? null;
}

/**
 * Extracts images from a listing
 */
export function extractImages(
  listing: SingleListingOutput | ListingOutput,
): FullImage[] {
  return listing?.images ?? [];
}

/**
 * Prepares base listings cache update
 */
export function prepareBaseListingsUpdate(
  freshListing: SingleListingOutput | null,
  existingBaseListings: BaseListingScalars[] | undefined,
): BaseListingScalars[] {
  if (!freshListing) return existingBaseListings ?? [];

  const baseListing = extractBaseListingFields(freshListing);
  if (!baseListing) return existingBaseListings ?? [];

  if (!existingBaseListings || existingBaseListings.length === 0) {
    return [baseListing];
  }

  // Check if the listing already exists
  const existingIndex = existingBaseListings.findIndex(
    (l: BaseListingScalars) => l.id === freshListing.id,
  );

  if (existingIndex >= 0) {
    // Replace existing
    return [
      ...existingBaseListings.slice(0, existingIndex),
      baseListing,
      ...existingBaseListings.slice(existingIndex + 1),
    ];
  } else {
    // Add new
    return [...existingBaseListings, baseListing];
  }
}

/**
 * Prepares AHS listings cache update
 */
export function prepareAhsListingsUpdate(
  freshListing: SingleListingOutput | null,
  existingAhsListings: AhsListingData[] | undefined,
): AhsListingData[] {
  if (!freshListing) return existingAhsListings ?? [];

  const ahsListing = extractAhsListingData(freshListing);
  if (!ahsListing) return existingAhsListings ?? [];

  if (!existingAhsListings || existingAhsListings.length === 0) {
    return [ahsListing];
  }

  const existingIndex = existingAhsListings.findIndex(
    (a: AhsListingData) => a.id === ahsListing.id,
  );

  if (existingIndex >= 0) {
    // Replace existing
    return [
      ...existingAhsListings.slice(0, existingIndex),
      ahsListing,
      ...existingAhsListings.slice(existingIndex + 1),
    ];
  } else {
    // Add new
    return [...existingAhsListings, ahsListing];
  }
}

/**
 * Prepares images cache update
 */
export function prepareImagesUpdate(
  freshListing: SingleListingOutput | null,
  existingImages: FullImage[] | undefined,
): FullImage[] {
  if (!freshListing) return existingImages ?? [];

  const freshImages = extractImages(freshListing);
  if (!freshImages.length) return existingImages ?? [];

  if (!existingImages || existingImages.length === 0) {
    return freshImages;
  }

  // Remove any existing images for this listing
  const filteredImages = existingImages.filter(
    (img: FullImage) => img.listingId !== freshListing.id,
  );

  // Add the new images
  return [...filteredImages, ...freshImages];
}

/**
 * Generates updates for lists cache
 */
export function prepareListsUpdates(
  listing: SingleListingOutput | ListingOutput | null,
  existingLists: ListWithListingIds[],
): ListWithListingIds[] {
  if (!listing || !listing.lists) return existingLists;

  // Start with a copy of existing lists
  const updatedLists = [...existingLists];

  // For each list in the listing
  listing.lists.forEach((listFromListing) => {
    // Find if this list exists in our current lists
    const existingIndex = updatedLists.findIndex(
      (l) => l.id === listFromListing.id,
    );

    if (existingIndex >= 0) {
      // List exists - ensure this listing is in the list's listings array
      const existingList = updatedLists[existingIndex];
      if (!existingList) return; // Guard against undefined

      const hasListing = existingList.listings.some((l) => l.id === listing.id);

      if (!hasListing) {
        // Add the listing to this list
        updatedLists[existingIndex] = {
          ...existingList,
          listings: [...existingList.listings, { id: listing.id }],
        };
      }
    } else {
      // This is a new list - add it with this listing
      updatedLists.push({
        id: listFromListing.id,
        title: listFromListing.title,
        description: listFromListing.description,
        status: listFromListing.status ?? null, // Ensure non-undefined status
        createdAt: listFromListing.createdAt,
        updatedAt: listFromListing.updatedAt,
        listings: [{ id: listing.id }],
      } as ListWithListingIds); // Type assertion for safety
    }
  });

  return updatedLists;
}

/**
 * Helper for full cache update with one listing
 * Returns objects ready to be used with setData on each cache
 */
export function processSingleListingForCacheUpdate(
  freshListing: SingleListingOutput | null,
  existingBaseListings: BaseListingScalars[] | undefined,
  existingAhsListings: AhsListingData[] | undefined,
  existingImages: FullImage[] | undefined,
  existingLists: ListWithListingIds[] | undefined,
) {
  // Guard against null listings
  if (!freshListing) {
    return {
      baseListings: existingBaseListings ?? [],
      ahsListings: existingAhsListings ?? [],
      images: existingImages ?? [],
      lists: existingLists ?? [],
    };
  }

  return {
    baseListings: prepareBaseListingsUpdate(freshListing, existingBaseListings),
    ahsListings: prepareAhsListingsUpdate(freshListing, existingAhsListings),
    images: prepareImagesUpdate(freshListing, existingImages),
    lists: prepareListsUpdates(freshListing, existingLists ?? []),
  };
}
