"use client";

import { ViewListingDialog } from "@/components/view-listing-dialog";
import { usePublicCatalogSearchController } from "./public-catalog-search-controller";
import { PublicCatalogSearchContent } from "./public-catalog-search-content";
import { type PublicCatalogSearchClientProps } from "./public-catalog-search-types";

export function PublicCatalogSearchClient({
  userId,
  userSlugOrId,
  lists,
  initialListings,
  totalListingsCount,
}: PublicCatalogSearchClientProps) {
  const controller = usePublicCatalogSearchController({
    initialListings,
    lists,
    userId,
    userSlugOrId,
  });

  return (
    <div className="space-y-6">
      <PublicCatalogSearchContent
        lists={lists}
        listings={controller.listings}
        isLoading={controller.isFetchingNextPage}
        totalListingsCount={totalListingsCount}
        isRefreshingCatalogData={controller.isRefreshingCatalogData}
        onRefreshCatalogData={controller.refreshCatalogData}
        controller={controller}
      />

      <ViewListingDialog listings={controller.listings} />
    </div>
  );
}
