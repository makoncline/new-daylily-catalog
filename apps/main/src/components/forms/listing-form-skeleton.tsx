"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AhsListingLinkSkeleton } from "@/components/ahs-listing-link";
import { MultiListSelectSkeleton } from "@/components/multi-list-select";
import { ImageManagerSkeleton } from "@/components/image-manager";

export function ListingFormSkeleton() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <AhsListingLinkSkeleton />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-12" />
        <MultiListSelectSkeleton />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-full" />
        <ImageManagerSkeleton />
      </div>

      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
