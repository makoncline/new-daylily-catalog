"use server";

import { Suspense } from "react";
import { api } from "@/trpc/server";
import { DataTable } from "./_components/listings-table/data-table";
import { columns } from "./_components/listings-table/columns";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateListingButton } from "./_components/create-listing-button";

async function ListingsContent() {
  const listings = await api.listing.list();
  return (
    <DataTable
      columns={columns}
      data={listings}
      options={{ pinnedColumns: { left: 1, right: 1 } }}
    />
  );
}

export default async function ListingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage and showcase your daylily listings.
          </p>
        </div>
        <CreateListingButton />
      </div>

      <div className="mt-8">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-[500px] w-full" />
            </div>
          }
        >
          <ListingsContent />
        </Suspense>
      </div>
    </div>
  );
}
