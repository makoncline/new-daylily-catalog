"use client";

import { ListingsTable } from "./_components/listings-table";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ListingsPage() {
  const router = useRouter();
  const { data: listings, isLoading } = api.listing.list.useQuery();

  return (
    <div className="container py-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Listings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your daylily listings
          </p>
        </div>
        <Button onClick={() => router.push("/listings/new")}>
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
