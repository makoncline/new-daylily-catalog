"use client";

import { H2 } from "@/components/typography";
import { type RouterOutputs } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

type Profile = RouterOutputs["public"]["getProfile"];

interface ListsSectionProps {
  lists: NonNullable<Profile>["lists"];
}

export function ListsSection({ lists }: ListsSectionProps) {
  if (!lists.length) return null;

  return (
    <div className="space-y-4">
      <H2 className="text-2xl">Lists</H2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <div
            key={list.id}
            className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
          >
            <div className="space-y-2">
              <h3 className="font-semibold">{list.title}</h3>
              {list.description && (
                <p className="text-sm text-muted-foreground">
                  {list.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {list.listingCount}{" "}
                {list.listingCount === 1 ? "listing" : "listings"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ListCardSkeleton = () => {
  return <Skeleton className="h-[120px] w-full" />;
};

export function ListsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-[120px]" />
      <div className="grid gap-4 sm:grid-cols-2">
        <ListCardSkeleton />
        <ListCardSkeleton />
      </div>
    </div>
  );
}
