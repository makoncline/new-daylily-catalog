import Link from "next/link";
import { Button } from "@/components/ui/button";
import { H2, Muted } from "@/components/typography";
import { type RouterOutputs } from "@/trpc/react";
import { CatalogSeoListingsGrid } from "./catalog-seo-listings-grid";
import { CatalogSeoPagination } from "./catalog-seo-pagination";

type Listing = RouterOutputs["public"]["getListings"][number];

export interface CatalogListingsSectionProps {
  canonicalUserSlug: string;
  listings: Listing[];
  page: number;
  totalPages: number;
  totalCount: number;
  totalCountLabel: string;
  searchHref: string;
}

export function CatalogListingsSection({
  canonicalUserSlug,
  listings,
  page,
  totalPages,
  totalCountLabel,
  searchHref,
}: CatalogListingsSectionProps) {
  return (
    <div id="listings" className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <H2 className="text-2xl">Listings</H2>
          <Muted>{totalCountLabel}</Muted>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href={searchHref}>Search and filter listings</Link>
            </Button>
          </div>

          <div className="flex justify-start sm:justify-end">
            <CatalogSeoPagination
              canonicalUserSlug={canonicalUserSlug}
              page={page}
              totalPages={totalPages}
              prevTestId="legacy-top-page-prev"
              indicatorTestId="legacy-top-page-indicator"
              nextTestId="legacy-top-page-next"
              goToPageTestId="legacy-top-page-go-to"
            />
          </div>
        </div>
      </div>

      {listings.length > 0 ? (
        <CatalogSeoListingsGrid listings={listings} />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Muted>No listings available.</Muted>
        </div>
      )}

      <div className="flex justify-start">
        <CatalogSeoPagination
          canonicalUserSlug={canonicalUserSlug}
          page={page}
          totalPages={totalPages}
          prevTestId="legacy-page-prev"
          indicatorTestId="legacy-page-indicator"
          nextTestId="legacy-page-next"
          goToPageTestId="legacy-page-go-to"
        />
      </div>
    </div>
  );
}
