"use client";

import { useEffect, useMemo } from "react";
import { ViewListingDialog } from "@/components/view-listing-dialog";
import { sortTitlesLettersBeforeNumbers } from "@/lib/utils/sort-utils";
import { api } from "@/trpc/react";
import { PublicCatalogSearchContent } from "./public-catalog-search-content";
import { type PublicCatalogSearchClientProps } from "./public-catalog-search-types";

export function PublicCatalogSearchClient({
  userSlugOrId,
  lists,
  initialListings,
  totalListingsCount,
}: PublicCatalogSearchClientProps) {
  const queryInput = useMemo(
    () => ({
      userSlugOrId,
      limit: 500,
    }),
    [userSlugOrId],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.public.getListings.useInfiniteQuery(queryInput, {
      getNextPageParam: (lastPage) => lastPage[lastPage.length - 1]?.id,
      retry: false,
    });

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
