"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ListingsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <Skeleton className="h-[400px]" />
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <Skeleton className="h-8 w-52" />
      </div>
    </div>
  );
}
