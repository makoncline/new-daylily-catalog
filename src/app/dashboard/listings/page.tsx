"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { ListingsTable } from "./_components/listings-table";

export default function ListingsPage(): React.JSX.Element {
  const router = useRouter();
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
        <Button onClick={() => router.push("/dashboard/listings/new")}>
          Add Listing
        </Button>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <ListingsTable listings={listings ?? []} />
        )}
      </div>
    </div>
  );
}
