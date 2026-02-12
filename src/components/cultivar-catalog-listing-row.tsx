import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/optimized-image";
import { formatPrice } from "@/lib/utils";
import { H3 } from "@/components/typography";
import { type RouterOutputs } from "@/trpc/react";

type CultivarPageOutput = NonNullable<RouterOutputs["public"]["getCultivarPage"]>;
type CultivarPageCatalogListing = CultivarPageOutput["catalogs"][number]["cultivarListings"][number];

export function getCultivarListingHref(sellerSlug: string, listingId: string) {
  const params = new URLSearchParams({ viewing: listingId });
  return `/${sellerSlug}?${params.toString()}`;
}

export function getCultivarListHref(sellerSlug: string, listId: string) {
  const params = new URLSearchParams({ lists: listId });
  return `/${sellerSlug}?${params.toString()}#listings`;
}

interface CultivarCatalogListingRowProps {
  sellerSlug: string;
  listing: CultivarPageCatalogListing;
}

export function CultivarCatalogListingRow({
  sellerSlug,
  listing,
}: CultivarCatalogListingRowProps) {
  const listingHref = getCultivarListingHref(sellerSlug, listing.id);

  return (
    <div
      className="flex gap-4 rounded-lg border p-4"
      data-testid="cultivar-catalog-listing-row"
      data-listing-id={listing.id}
    >
      {listing.previewImageUrl && (
        <Link
          href={listingHref}
          className="h-24 w-24 shrink-0 overflow-hidden rounded-md"
        >
          <OptimizedImage
            src={listing.previewImageUrl}
            alt={`${listing.title} image`}
            className="h-24"
          />
        </Link>
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <H3 className="text-xl">
              <Link href={listingHref} className="hover:underline">
                {listing.title}
              </Link>
            </H3>

            <div className="flex flex-wrap items-center gap-2">
              {listing.price !== null ? (
                <Badge variant="secondary">{formatPrice(listing.price)}</Badge>
              ) : (
                <Badge variant="outline">Not for sale</Badge>
              )}
            </div>
          </div>

          <Button asChild size="sm" variant="outline">
            <Link href={listingHref}>
              View Listing
              <ArrowUpRight />
            </Link>
          </Button>
        </div>

        {listing.lists.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {listing.lists.map((list) => (
              <Link
                key={list.id}
                href={getCultivarListHref(sellerSlug, list.id)}
                className="inline-flex"
              >
                <Badge variant="secondary">{list.title}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
