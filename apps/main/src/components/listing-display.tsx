"use client";

import { ImageGallery } from "@/components/image-gallery";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { formatAhsListingSummary, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { H1, H2, Muted, P } from "@/components/typography";
import { ImagePlaceholder } from "./image-placeholder";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { type RouterOutputs } from "@/trpc/react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { useDisplayAhsListing } from "@/hooks/use-display-ahs-listing";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { CopyListingLinkButton } from "@/components/copy-listing-link-button";

type Listing = RouterOutputs["public"]["getListings"][number];

export interface ListingDisplayProps {
  listing: Listing;
  variant?: "page" | "dialog";
}

export function ListingDisplay({
  listing,
  variant = "dialog",
}: ListingDisplayProps) {
  const displayAhsListing = useDisplayAhsListing(listing);
  const cultivarRouteSegment = toCultivarRouteSegment(
    listing.cultivarReference?.normalizedName,
  );
  const cultivarHref = cultivarRouteSegment
    ? `/cultivar/${cultivarRouteSegment}`
    : null;
  const listingHref = `/${listing.userSlug}/${listing.slug || listing.id}`;

  // Determine which heading component to use based on variant
  const HeadingComponent = variant === "page" ? H1 : H2;
  const trimmedDescription = listing.description?.trim();
  const buyerDescription =
    trimmedDescription && trimmedDescription.length > 0
      ? trimmedDescription
      : formatAhsListingSummary(displayAhsListing);

  return (
    <div className="space-y-8">
      {listing.images.length > 0 ? (
        <ImageGallery
          images={listing.images}
          className="max-w-full"
          listingTitle={listing.title}
          listingName={displayAhsListing?.name ?? undefined}
        />
      ) : (
        <ImagePlaceholder />
      )}

      <div className="space-y-1">
        {/* Title and external link */}
        <div className="flex items-center justify-between gap-4">
          <HeadingComponent>{listing.title}</HeadingComponent>
          <div className="flex shrink-0 items-center gap-1">
            {variant !== "page" && (
              <Link
                href={listingHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Open listing page"
              >
                <ExternalLink className="text-muted-foreground hover:text-foreground size-5 transition-colors" />
                <span className="sr-only">Open listing page</span>
              </Link>
            )}
            <CopyListingLinkButton
              listingId={listing.id}
              listingUrl={listingHref}
              sellerId={listing.userId}
              pageType={variant === "page" ? "public_listing" : "catalog_modal"}
              className="size-7"
            />
          </div>
        </div>
        {/* Price and Add to Cart */}
        {listing.price && (
          <div className="flex flex-row items-center justify-between gap-4">
            <P className="text-primary text-lg font-medium">
              {formatPrice(listing.price)}
            </P>
            <AddToCartButton
              listing={{
                id: listing.id,
                title: listing.title,
                price: listing.price,
                userId: listing.userId,
              }}
            />
          </div>
        )}
        {/* Lists/Badges */}
        {listing.lists.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {listing.lists.map((list) => (
              <Badge key={list.id} variant="secondary">
                {list.title}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {buyerDescription && (
        <P className="text-muted-foreground">{buyerDescription}</P>
      )}

      {displayAhsListing && (
        <>
          <Separator />
          <Muted>Daylily Database Data</Muted>
          <AhsListingDisplay
            ahsListing={displayAhsListing}
            cultivarHref={cultivarHref}
            cultivarReferenceImage={listing.cultivarReferenceImage}
          />
        </>
      )}
    </div>
  );
}

export function ListingDisplaySkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="aspect-3/2 w-full rounded-lg" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
