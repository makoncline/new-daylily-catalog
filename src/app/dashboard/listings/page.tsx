"use client";

import { api } from "@/trpc/react";
import { DataTable } from "./_components/listings-table/data-table";
import { columns } from "./_components/listings-table/columns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListingsPage() {
  const { data: listings, isLoading } = api.listing.list.useQuery();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage and showcase your daylily listings.
          </p>
        </div>
        <Button asChild>
          <a href="/dashboard/listings/new">Add Listing</a>
        </Button>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={listings ?? []}
            options={{
              pinnedColumns: { left: 1, right: 1 },
            }}
          />
        )}
      </div>
    </div>
  );
}
