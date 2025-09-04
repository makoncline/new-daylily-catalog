"use client";

import { ImageGallery } from "@/components/image-gallery";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { H1, H2, Muted, P } from "@/components/typography";
import { ImagePlaceholder } from "./image-placeholder";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { type RouterOutputs } from "@/trpc/react";
import { AddToCartButton } from "@/components/add-to-cart-button";

type Listing = RouterOutputs["public"]["getListings"][number];

export interface ListingDisplayProps {
  listing: Listing;
  variant?: "page" | "dialog";
}

export function ListingDisplay({
  listing,
  variant = "dialog",
}: ListingDisplayProps) {
  // Determine which heading component to use based on variant
  const HeadingComponent = variant === "page" ? H1 : H2;

  return (
    <div className="space-y-8">
      {listing.images.length > 0 ? (
        <ImageGallery
          images={listing.images}
          className="max-w-full"
          listingTitle={listing.title}
          listingName={listing.ahsListing?.name ?? undefined}
        />
      ) : (
        <ImagePlaceholder />
      )}

      <div className="space-y-1">
        {/* Title and external link */}
        <div className="flex items-center justify-between gap-4">
          <HeadingComponent>{listing.title}</HeadingComponent>
          {listing.slug && variant !== "page" && (
            <Link href={`/${listing.user.profile?.slug}/${listing.slug}`}>
              <ExternalLink className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
              <span className="sr-only">View Listing Page</span>
            </Link>
          )}
        </div>
        {/* Price and Add to Cart */}
        {listing.price && (
          <div className="flex flex-row items-center justify-between gap-4">
            <P className="text-lg font-medium text-primary">
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

      <P className="text-muted-foreground">
        {listing.description ?? "No description available"}
      </P>

      {listing.ahsListing && (
        <>
          <Separator />
          <Muted>Daylily Database Data</Muted>
          <AhsListingDisplay ahsListing={listing.ahsListing} />
        </>
      )}
    </div>
  );
}

export function ListingDisplaySkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="aspect-[3/2] w-full rounded-lg" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
