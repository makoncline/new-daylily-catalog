"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ListingsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="h-16 border-b px-4">
          <div className="flex h-full items-center space-x-4">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 border-b px-4 last:border-0">
            <div className="flex h-full items-center space-x-4">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
