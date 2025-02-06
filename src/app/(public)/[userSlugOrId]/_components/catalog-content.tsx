"use client";

import { type RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ListingsContent } from "./listings-content";
import { ViewListingDialog } from "@/components/view-listing-dialog";
import { TIME } from "@/config/constants";

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
  const [allListings, setAllListings] = useState<Listing[]>(initialListings);

  // Fetch listings with infinite query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.public.getListings.useInfiniteQuery(
      {
        userSlugOrId: params.userSlugOrId,
        limit: 100,
      },
      {
        getNextPageParam: (lastPage) => lastPage[lastPage.length - 1]?.id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: TIME.HOUR_IN_MS,
        gcTime: TIME.HOUR_IN_MS,
        initialData: {
          pages: [initialListings],
          pageParams: [undefined],
        },
        retry: false,
        refetchOnMount: false,
        refetchInterval: false,
      },
    );

  // Update listings when we get new pages
  useEffect(() => {
    if (data?.pages) {
      const allItems = data.pages.flat();
      setAllListings(allItems);

      // If there's more data, fetch it immediately
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    }
  }, [data?.pages, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      <ListingsContent
        lists={lists}
        listings={allListings}
        isLoading={isFetchingNextPage}
      />

      <ViewListingDialog listings={allListings} />
    </div>
  );
}
