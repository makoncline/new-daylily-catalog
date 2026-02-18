"use client";

import { ListingCard } from "@/components/listing-card";
import { ViewListingDialog } from "@/components/view-listing-dialog";
import { type RouterOutputs } from "@/trpc/react";

type Listing = RouterOutputs["public"]["getListings"][number];

interface CatalogSeoListingsGridProps {
  listings: Listing[];
}

export function CatalogSeoListingsGrid({ listings }: CatalogSeoListingsGridProps) {
  if (listings.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {listings.map((listing) => (
          <div key={listing.id}>
            <ListingCard listing={listing} />
          </div>
        ))}
      </div>

      <ViewListingDialog listings={listings} />
    </>
  );
}
