import { STATUS } from "@/config/constants";
import { sortTitlesLettersBeforeNumbers } from "@/lib/utils/sort-utils";
import { db } from "@/server/db";
import { type Prisma } from "@prisma/client";

// --- Core Select Objects ---

// Select for FULL image details
export const fullImageSelect: Prisma.ImageSelect = {
  // Export needed for UserImages type
  id: true,
  url: true,
  status: true,
  order: true,
  listingId: true, // Need listingId to map back
  createdAt: true,
  updatedAt: true,
  userProfileId: true, // Add userProfileId to match Prisma ImageType
};

// Select for FULL list details
export const fullListSelect: Prisma.ListSelect = {
  // Export needed for ListsAndEntries type
  id: true,
  userId: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

// Select for AHS Listing data
const ahsListingSelect: Prisma.AhsListingSelect = {
  id: true,
  name: true,
  ahsImageUrl: true,
  hybridizer: true,
  year: true,
  scapeHeight: true,
  bloomSize: true,
  bloomSeason: true,
  form: true,
  ploidy: true,
  foliageType: true,
  bloomHabit: true,
  budcount: true,
  branches: true,
  sculpting: true,
  foliage: true,
  flower: true,
  fragrance: true,
  parentage: true,
  color: true,
  createdAt: true,
  updatedAt: true,
  seedlingNum: true,
};

// Select for the BASE listing data - SCALARS ONLY
const baseListingSelectScalars: Prisma.ListingSelect = {
  id: true,
  userId: true,
  title: true,
  slug: true,
  price: true,
  description: true,
  ahsId: true, // Keep FK for linking AHS data
  status: true,
  createdAt: true,
  updatedAt: true,
  // NO joins for images or lists here
};

// Optional fields for owners
const privateListingSelect: Prisma.ListingSelect = {
  privateNote: true,
};

// Select for a fully detailed single listing (still useful for individual page views)
// Reconstruct this select without relying on baseListingSelectMinimal having joins
const singleListingSelectDetailed = (isOwner: boolean) => ({
  // Scalars
  id: true,
  userId: true,
  title: true,
  slug: true,
  price: true,
  description: true,
  ahsId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  ...(isOwner && privateListingSelect),
  // Detailed Joins
  images: {
    select: fullImageSelect,
    ...getStatusFilter(isOwner), // Apply filter to related images
    orderBy: { order: "asc" as const },
  },
  lists: {
    select: fullListSelect,
    ...getStatusFilter(isOwner), // Apply filter to related lists
  },
  ahsListing: {
    select: ahsListingSelect,
  },
});

// Helper for filtering by status based on ownership
const getStatusFilter = (isOwner: boolean) =>
  isOwner ? {} : { status: { not: STATUS.HIDDEN } };

// --- Type Definitions ---

// Type for the base listing scalars
export type BaseListingScalars = Prisma.ListingGetPayload<{
  select: typeof baseListingSelectScalars;
}>;

// Type for the AHS data
export type AhsListingData = Prisma.AhsListingGetPayload<{
  select: typeof ahsListingSelect;
}>;

// Type for the full image data
export type FullImage = Prisma.ImageGetPayload<{
  select: typeof fullImageSelect;
}>;

// Type for the full list data
export type FullList = Prisma.ListGetPayload<{
  select: typeof fullListSelect;
}>;

// Type for Lists including the IDs of their associated Listings
export type ListWithListingIds = FullList & {
  listings: { id: string }[];
};

// Type for the detailed single listing
export type DetailedSingleListing = Prisma.ListingGetPayload<{
  select: ReturnType<typeof singleListingSelectDetailed>;
}>;

// **Type for the final combined structure within UserDataContext**
export type ContextListing = BaseListingScalars & {
  ahsListing: AhsListingData | null;
  images: FullImage[]; // Images will be added client-side
  lists: FullList[]; // Full list objects will be added client-side
};

// --- Database Functions ---

// Fetches a single, fully detailed listing
export async function getListing(
  listingId: string,
  isOwner: boolean,
): Promise<DetailedSingleListing | null> {
  const listing = await db.listing.findUnique({
    where: {
      id: listingId,
      ...getStatusFilter(isOwner), // Filter the main listing
    },
    select: singleListingSelectDetailed(isOwner), // Select includes filtering on relations
  });
  return listing;
}

// Fetches BASE SCALAR data for all user listings
export async function getBaseListings(
  userId: string,
  isOwner: boolean,
): Promise<BaseListingScalars[]> {
  const listings = await db.listing.findMany({
    where: {
      userId,
      ...getStatusFilter(isOwner), // Filter listings by status
    },
    select: {
      ...baseListingSelectScalars,
      ...(isOwner && privateListingSelect),
    },
  });
  // Apply sorting if needed, though might be better client-side after joins
  return sortTitlesLettersBeforeNumbers(listings);
}

// Fetches ALL images for a user's listings
export async function getUserImages(
  userId: string,
  isOwner: boolean,
): Promise<FullImage[]> {
  const images = await db.image.findMany({
    where: {
      listing: {
        userId: userId, // Filter images based on the listing's owner
      },
      ...getStatusFilter(isOwner), // Apply status filter to images themselves
    },
    select: fullImageSelect,
    orderBy: {
      order: "asc", // Keep image order consistent
    },
  });
  return images;
}

// Fetches ALL lists for a user, including the IDs of associated listings
export async function getListsAndEntries(
  userId: string,
  isOwner: boolean,
): Promise<ListWithListingIds[]> {
  const lists = await db.list.findMany({
    where: {
      userId,
      ...getStatusFilter(isOwner), // Filter lists by status
    },
    select: {
      ...fullListSelect, // Select all list fields
      listings: {
        // Include the join info
        select: { id: true }, // Only need listing IDs
        where: {
          ...getStatusFilter(isOwner), // Also filter associated listings by status
        },
      },
    },
  });
  // Apply sorting if needed
  return sortTitlesLettersBeforeNumbers(lists as ListWithListingIds[]);
}

// Fetches AHS data based on IDs
export async function getAhsListings(
  ahsListingIds: string[],
): Promise<AhsListingData[]> {
  if (ahsListingIds.length === 0) {
    return [];
  }
  const listings = await db.ahsListing.findMany({
    where: {
      id: { in: ahsListingIds },
    },
    select: ahsListingSelect,
  });
  return listings;
}

// Get unique AHS IDs from a user's listings
export async function getUserAhsIds(userId: string): Promise<string[]> {
  // Get only the listings with an ahsId
  const listings = await db.listing.findMany({
    where: {
      userId,
      ahsId: { not: null },
    },
    select: {
      ahsId: true,
    },
  });

  // Extract and deduplicate the AHS IDs
  const ahsIds = Array.from(new Set(listings.map((listing) => listing.ahsId!)));

  return ahsIds;
}
