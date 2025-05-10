"use client";

import { createContext, useContext, useMemo, useCallback } from "react";
import { api } from "@/trpc/react";
import {
  type FullList,
  type AhsListingData,
  type ContextListing,
  type FullImage,
} from "@/server/db/user-data";
import { processSingleListingForCacheUpdate } from "./user-data-utils";
import { tryCatch } from "@/lib/utils";
import { reportError } from "@/lib/error-utils";

// Extended interface with cache update methods
interface UserDataContextType {
  /** Listings combined with AHS, Image, and List data */
  listings: ContextListing[];
  /** Full list details (fetched separately) */
  lists: FullList[];
  /** Indicates if the basic listing data is loading */
  isLoadingBaseListingData: boolean;
  /** Indicates if the full listing data is loading (includes AHS, images, lists) */
  isLoadingFullListingData: boolean;

  /**
   * Fetch a listing by ID and add/update it in all relevant caches
   * If the listing already exists, it will be replaced with the latest data
   */
  addListingToCache: (listingId: string) => Promise<void>;

  /**
   * Remove a listing from the cache
   * Cleans up all related caches (base listings, AHS data, images)
   */
  removeListingFromCache: (listingId: string) => void;

  /**
   * Refetch all data from the database
   * @returns Promise that resolves when all data is refreshed
   */
  refetchAllData: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(
  undefined,
);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const utils = api.useUtils();

  // 1. Fetch Base Listings Scalars - Primary Query
  const baseListingsQuery = api.dashboard.getBaseListings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // 2. Fetch Lists and Entries - Secondary Query
  const listsAndEntriesQuery = api.dashboard.getListsAndEntries.useQuery(
    undefined,
    {
      enabled: baseListingsQuery.isSuccess, // Only start after base listings load
      staleTime: 15 * 60 * 1000, // 15 minutes
    },
  );

  // 3. Fetch All User Images - Secondary Query
  const userImagesQuery = api.dashboard.getUserImages.useQuery(undefined, {
    enabled: baseListingsQuery.isSuccess, // Only start after base listings load
    staleTime: 5 * 60 * 1000, // Images might change with listings
  });

  // 4. Fetch AHS Listings - Secondary Query
  const ahsListingsQuery = api.dashboard.getAhsListings.useQuery(undefined, {
    enabled: baseListingsQuery.isSuccess, // Only start after base listings load
    staleTime: Infinity, // AHS data is static
    refetchOnWindowFocus: false,
  });

  // --- Cache manipulation functions ---

  const addListingToCache = useCallback(
    async (listingId: string) => {
      // Get the listing data from the server to ensure we're up to date
      const result = await tryCatch(
        utils.dashboard.getSingleListing.fetch({
          id: listingId,
        }),
      );

      if (result.error) {
        reportError({
          error: result.error,
          level: "error",
          context: { listingId, operation: "addListingToCache" },
        });
        return;
      }

      const freshListing = result.data;
      if (!freshListing) {
        const error = new Error(`Listing not found: ${listingId}`);
        reportError({
          error,
          level: "error",
          context: { listingId, operation: "addListingToCache" },
        });
        return;
      }

      // Use utility functions to prepare cache updates
      const cacheUpdates = processSingleListingForCacheUpdate(
        freshListing,
        baseListingsQuery.data,
        ahsListingsQuery.data,
        userImagesQuery.data,
        listsAndEntriesQuery.data,
      );

      // Apply the updates to caches
      utils.dashboard.getBaseListings.setData(
        undefined,
        cacheUpdates.baseListings,
      );
      utils.dashboard.getAhsListings.setData(
        undefined,
        cacheUpdates.ahsListings,
      );
      utils.dashboard.getUserImages.setData(undefined, cacheUpdates.images);
      utils.dashboard.getListsAndEntries.setData(undefined, cacheUpdates.lists);
    },
    [
      utils.dashboard,
      baseListingsQuery.data,
      ahsListingsQuery.data,
      userImagesQuery.data,
      listsAndEntriesQuery.data,
    ],
  );

  const removeListingFromCache = useCallback(
    (listingId: string) => {
      // Update the base listings cache to remove the deleted listing
      utils.dashboard.getBaseListings.setData(undefined, (old) => {
        if (!old) return [];
        return old.filter((listing) => listing.id !== listingId);
      });

      // Clean up images cache
      utils.dashboard.getUserImages.setData(undefined, (old) => {
        if (!old) return [];
        return old.filter((img) => img.listingId !== listingId);
      });

      // Update lists to remove this listing from all list entries
      utils.dashboard.getListsAndEntries.setData(undefined, (old) => {
        if (!old) return [];
        return old.map((list) => ({
          ...list,
          listings: list.listings.filter((l) => l.id !== listingId),
        }));
      });

      // Remove from the specific listing query cache
      utils.listing.get.setData({ id: listingId }, undefined);
    },
    [utils.dashboard, utils.listing],
  );

  // 6. Create lookup map for AHS data
  const ahsDataMap = useMemo(() => {
    const map = new Map<string, AhsListingData>();
    ahsListingsQuery.data?.forEach((ahs) => map.set(ahs.id, ahs));
    return map;
  }, [ahsListingsQuery.data]);

  // 7. Create lookup map for List data (ID -> FullList)
  // And map of Listing ID -> List[]
  const { listDataMap, listingToListsMap } = useMemo(() => {
    const listMap = new Map<string, FullList>();
    const listingMap = new Map<string, FullList[]>(); // listingId -> list objects

    listsAndEntriesQuery.data?.forEach((listWithEntries) => {
      // Add to listDataMap
      listMap.set(listWithEntries.id, listWithEntries);

      // Map each listing ID to this list
      listWithEntries.listings.forEach((listingRef) => {
        const currentLists = listingMap.get(listingRef.id) ?? [];
        listingMap.set(listingRef.id, [...currentLists, listWithEntries]);
      });
    });

    return { listDataMap: listMap, listingToListsMap: listingMap };
  }, [listsAndEntriesQuery.data]);

  // 8. Create lookup map for Image data (Listing ID -> FullImage[])
  const imagesByListingId = useMemo(() => {
    const map = new Map<string, FullImage[]>();
    userImagesQuery.data?.forEach((image) => {
      if (image.listingId) {
        const currentImages = map.get(image.listingId) ?? [];
        map.set(image.listingId, [...currentImages, image]);
      }
    });

    // Ensure consistent order within each listing's images
    map.forEach((images) => images.sort((a, b) => a.order - b.order));

    return map;
  }, [userImagesQuery.data]);

  // 9. Get all lists as a flat array (for dropdown filters, etc.)
  const lists = useMemo(() => {
    return Array.from(listDataMap.values());
  }, [listDataMap]);

  // 10. Memoize the combined listings
  const contextListings = useMemo<ContextListing[]>(() => {
    const baseData = baseListingsQuery.data ?? [];

    return baseData.map((baseListing) => {
      // Find corresponding AHS data
      const ahsListing = baseListing.ahsId
        ? (ahsDataMap.get(baseListing.ahsId) ?? null)
        : null;

      // Find corresponding Images
      const images = imagesByListingId.get(baseListing.id) ?? [];

      // Find corresponding Lists
      const lists = listingToListsMap.get(baseListing.id) ?? [];

      // Construct the ContextListing object
      return {
        ...baseListing,
        ahsListing,
        images,
        lists,
      };
    });
  }, [
    baseListingsQuery.data,
    ahsDataMap,
    imagesByListingId,
    listingToListsMap,
  ]);

  // Simplified loading states as requested
  const isLoadingBaseListingData = baseListingsQuery.isLoading;
  const isLoadingFullListingData =
    baseListingsQuery.isLoading ||
    listsAndEntriesQuery.isLoading ||
    userImagesQuery.isLoading ||
    ahsListingsQuery.isLoading;

  // Refetch all data from the database
  const refetchAllData = useCallback(async () => {
    try {
      // Refetch base listings first
      await baseListingsQuery.refetch();

      // Refetch all secondary data in parallel
      await Promise.all([
        listsAndEntriesQuery.refetch(),
        userImagesQuery.refetch(),
        ahsListingsQuery.refetch(),
      ]);
    } catch (error) {
      reportError({
        error: error instanceof Error ? error : new Error(String(error)),
        level: "error",
        context: { operation: "refetchAllData" },
      });
    }
  }, [
    baseListingsQuery,
    listsAndEntriesQuery,
    userImagesQuery,
    ahsListingsQuery,
  ]);

  return (
    <UserDataContext.Provider
      value={{
        listings: contextListings,
        lists,
        isLoadingBaseListingData,
        isLoadingFullListingData,
        addListingToCache,
        removeListingFromCache,
        refetchAllData,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
}
