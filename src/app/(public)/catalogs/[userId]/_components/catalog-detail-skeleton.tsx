"use client";

import { MainContent } from "@/app/(public)/_components/main-content";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeleton } from "@/components/listing-card";

export function CatalogDetailSkeleton() {
  return (
    <MainContent>
      <div className="space-y-8">
        {/* Title Section */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>

        {/* Images */}
        <Skeleton className="aspect-[16/9] w-full rounded-lg" />

        {/* Bio */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-[100px]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        </div>

        {/* Lists */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-[100px]" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-[120px]" />
                  <Skeleton className="h-4 w-[180px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Listings */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-[100px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </MainContent>
  );
}
