"use client";

import { useEffect, useMemo, useState } from "react";
import { ViewListingDialog } from "@/components/view-listing-dialog";
import { TIME } from "@/config/constants";
import {
  createPublicCatalogSearchSnapshotFromInfiniteData,
  isPublicCatalogSearchSnapshotUsable,
  prefetchAndPersistPublicCatalogSearchSnapshot,
  PUBLIC_CATALOG_SEARCH_PERSISTED_SWR,
  readPublicCatalogSearchSnapshot,
  snapshotToInfiniteData,
  writePublicCatalogSearchSnapshot,
} from "@/lib/public-catalog-search-persistence";
import { sortTitlesLettersBeforeNumbers } from "@/lib/utils/sort-utils";
import { api } from "@/trpc/react";
import { PublicCatalogSearchContent } from "./public-catalog-search-content";
import { type PublicCatalogSearchClientProps } from "./public-catalog-search-types";

export function PublicCatalogSearchClient({
  userId,
  userSlugOrId,
  lists,
  initialListings,
  totalListingsCount,
}: PublicCatalogSearchClientProps) {
  const utils = api.useUtils();
  const [isSnapshotCheckDone, setIsSnapshotCheckDone] = useState(
    !PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.enabled,
  );
  const queryInput = useMemo(
    () => ({
      userSlugOrId,
      limit: PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.queryLimit,
    }),
    [userSlugOrId],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.public.getListings.useInfiniteQuery(queryInput, {
      getNextPageParam: (lastPage) => lastPage[lastPage.length - 1]?.id,
      initialData: {
        pages: [initialListings],
        pageParams: [undefined],
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: TIME.HOUR_IN_MS,
      gcTime: TIME.HOUR_IN_MS,
      retry: false,
      refetchOnMount: false,
      refetchInterval: false,
    });

  useEffect(() => {
    if (!PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.enabled) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const snapshot = await readPublicCatalogSearchSnapshot(userId);
      if (snapshot && isPublicCatalogSearchSnapshotUsable(snapshot)) {
        utils.public.getListings.setInfiniteData(queryInput, () =>
          snapshotToInfiniteData(snapshot),
        );

        void prefetchAndPersistPublicCatalogSearchSnapshot({
          userId,
          userSlugOrId,
          force: true,
        }).then((revalidatedSnapshot) => {
          if (cancelled || !revalidatedSnapshot) {
            return;
          }

          utils.public.getListings.setInfiniteData(queryInput, () =>
            snapshotToInfiniteData(revalidatedSnapshot),
          );
        });
      }

      if (!cancelled) {
        setIsSnapshotCheckDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryInput, userId, userSlugOrId, utils]);

  useEffect(() => {
    if (!isSnapshotCheckDone) {
      return;
    }

    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isSnapshotCheckDone]);

  useEffect(() => {
    if (!PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.enabled) {
      return;
    }

    if (!data?.pages?.length || hasNextPage || isFetchingNextPage) {
      return;
    }

    const snapshot = createPublicCatalogSearchSnapshotFromInfiniteData({
      userId,
      userSlugOrId,
      data,
    });

    void writePublicCatalogSearchSnapshot(snapshot);
  }, [data, hasNextPage, isFetchingNextPage, userId, userSlugOrId]);

  const dataPages = data?.pages;
  const listings = (() => {
    if (!dataPages) {
      return initialListings;
    }

    const allListings = dataPages.flat();
    const uniqueListings = new Map<string, (typeof allListings)[number]>();

    allListings.forEach((listing) => {
      uniqueListings.set(listing.id, listing);
    });

    return sortTitlesLettersBeforeNumbers(Array.from(uniqueListings.values()));
  })();

  return (
    <div className="space-y-6">
      <PublicCatalogSearchContent
        lists={lists}
        listings={listings}
        isLoading={isFetchingNextPage}
        totalListingsCount={totalListingsCount}
      />

      <ViewListingDialog listings={listings} />
    </div>
  );
}
