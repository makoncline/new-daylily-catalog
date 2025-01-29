"use client";

import { api } from "@/trpc/react";
import { ImageGallery, ImageGallerySkeleton } from "@/components/image-gallery";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImageIcon } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { H2, Muted, P } from "@/components/typography";
import { ImagePlaceholder } from "./image-placeholder";

interface ListingDisplayProps {
  listingId: string;
}

export function ListingDisplay({ listingId }: ListingDisplayProps) {
  const [listing] = api.public.getListing.useSuspenseQuery({ id: listingId });

  if (!listing) return null;

  return (
    <div className="space-y-4">
      {listing.images.length > 0 ? (
        <ImageGallery images={listing.images} className="max-w-full" />
      ) : (
        <ImagePlaceholder />
      )}
      <div className="flex justify-between">
        <div>
          <H2 className="border-b-0">{listing.title}</H2>
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
        {listing.price && (
          <P className="text-lg font-medium text-primary">
            {formatPrice(listing.price)}
          </P>
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
    <div className="space-y-6">
      <ImageGallerySkeleton />
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
