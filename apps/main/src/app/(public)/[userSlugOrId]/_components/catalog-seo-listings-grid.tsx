"use client";

import { CatalogListingGrid } from "@/components/catalog-listing-grid";
import { ListingCard, ListingCardAction } from "@/components/listing-card";
import { ViewListingDialog } from "@/components/view-listing-dialog";
import { getPublicListingPath } from "@/lib/public-catalog-url-state";
import { type RouterOutputs } from "@/trpc/react";

type Listing = RouterOutputs["public"]["getListings"][number];

interface CatalogSeoListingsGridProps {
  canonicalUserSlug: string;
  listings: Listing[];
}

export function CatalogSeoListingsGrid({
  canonicalUserSlug,
  listings,
}: CatalogSeoListingsGridProps) {
  if (listings.length === 0) {
    return null;
  }

  return (
    <>
      <CatalogListingGrid>
        {listings.map((listing) => (
          <div key={listing.id}>
            <ListingCard listing={listing}>
              <ListingCardAction asChild>
                <a
                  href={getPublicListingPath({
                    listingId: listing.id,
                    listingSlug: listing.slug,
                    sellerSlug: canonicalUserSlug,
                  })}
                  aria-label={`View ${listing.title}`}
                />
              </ListingCardAction>
            </ListingCard>
          </div>
        ))}
      </CatalogListingGrid>

      <ViewListingDialog listings={listings} />
    </>
  );
}
