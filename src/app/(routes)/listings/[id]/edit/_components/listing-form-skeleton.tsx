"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AhsListingLinkSkeleton } from "@/components/ahs-listing-link";
import { ListSelectSkeleton } from "@/components/list-select";
import { ImageManagerSkeleton } from "@/components/image-manager";

export function ListingFormSkeleton() {
  return (
    <div className="space-y-8">
      {/* Name field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Price field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Public Note field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Private Note field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* AHS Listing field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <AhsListingLinkSkeleton />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* List field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <ListSelectSkeleton />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Images field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-96" />
        <ImageManagerSkeleton />
      </div>

      {/* Delete button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
