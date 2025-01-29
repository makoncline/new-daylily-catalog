"use client";

import { api } from "@/trpc/react";
import { ImageGallery, ImageGallerySkeleton } from "@/components/image-gallery";
import {
  AhsListingDisplay,
  AhsListingDisplaySkeleton,
} from "@/components/ahs-listing-display";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImageIcon } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

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
        <div className="aspect-square">
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
      )}
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{listing.title}</h2>
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
          <p className="text-lg font-medium text-primary">
            {formatPrice(listing.price)}
          </p>
        )}
      </div>

      <p className="text-muted-foreground">
        {listing.description ?? "No description available"}
      </p>

      {listing.ahsListing && (
        <>
          <Separator />
          <div>
            <h3 className="mb-4 text-lg font-medium">Daylily Database Data</h3>
            <AhsListingDisplay ahsListing={listing.ahsListing} />
          </div>
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
