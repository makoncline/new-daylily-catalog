"use client";

import { useEffect, useMemo } from "react";
import { api } from "@/trpc/react";
import { ViewListingDialog } from "@/components/view-listing-dialog";
import { TIME } from "@/config/constants";
import { sortTitlesLettersBeforeNumbers } from "@/lib/utils/sort-utils";
import { PublicCatalogSearchContent } from "./public-catalog-search-content";
import { type PublicCatalogSearchClientProps } from "./public-catalog-search-types";

export function PublicCatalogSearchClient({
  userSlugOrId,
  lists,
  initialListings,
}: PublicCatalogSearchClientProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.public.getListings.useInfiniteQuery(
      {
        userSlugOrId,
        limit: 500,
      },
      {
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
      },
    );

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const listings = useMemo(() => {
    if (!data?.pages) {
      return initialListings;
    }

    const allListings = data.pages.flat();
    const uniqueMap = new Map<string, (typeof allListings)[number]>();

    allListings.forEach((listing) => {
      uniqueMap.set(listing.id, listing);
    });

    return sortTitlesLettersBeforeNumbers(Array.from(uniqueMap.values()));
  }, [data?.pages, initialListings]);

  return (
    <div className="space-y-6">
      <PublicCatalogSearchContent
        lists={lists}
        listings={listings}
        isLoading={isFetchingNextPage}
      />

      <ViewListingDialog listings={listings} />
    </div>
  );
}
