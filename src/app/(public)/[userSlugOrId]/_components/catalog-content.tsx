"use client";

import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ListingsContent } from "./listings-content";
import { ViewListingDialog } from "@/components/view-listing-dialog";
import { TIME } from "@/config/constants";
import { sortTitlesLettersBeforeNumbers } from "@/lib/utils/sort-utils";

type Listing = RouterOutputs["public"]["getListings"][number];
type Profile = RouterOutputs["public"]["getProfile"];
type ProfileLists = NonNullable<Profile>["lists"];

interface CatalogContentProps {
  lists: ProfileLists;
  initialListings: Listing[];
}

export function CatalogContent({
  lists,
  initialListings,
}: CatalogContentProps) {
  const params = useParams<{ userSlugOrId: string }>();

  // Fetch listings with infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.public.getListings.useInfiniteQuery(
      {
        userSlugOrId: params.userSlugOrId,
        limit: 500,
      },
      {
        getNextPageParam: (lastPage: Listing[]): string | undefined =>
          lastPage[lastPage.length - 1]?.id,
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

  // Auto-fetch next page if available
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Process listings - deduplicate and sort
  const processedListings = useMemo(() => {
    if (!data?.pages) return initialListings;

    // Flatten all pages
    const allItems = data.pages.flat();

    // Deduplicate by ID
    const uniqueMap = new Map<string, Listing>();
    allItems.forEach((listing) => {
      uniqueMap.set(listing.id, listing);
    });

    // Get unique listings and sort them
    const uniqueListings = Array.from(uniqueMap.values());
    return sortTitlesLettersBeforeNumbers(uniqueListings);
  }, [data?.pages, initialListings]);

  return (
    <div className="space-y-6">
      <ListingsContent
        lists={lists}
        listings={processedListings}
        isLoading={isFetchingNextPage}
      />

      <ViewListingDialog listings={processedListings} />
    </div>
  );
}
