"use client";

import { api } from "@/trpc/react";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import type { ListingGetOutput } from "@/server/api/routers/listing";

interface ListingsTableProps {
  initialListings: ListingGetOutput[];
}

export function ListingsTable({ initialListings }: ListingsTableProps) {
  // Use the initial data from the server, but keep it fresh with client-side updates
  const { data: listings } = api.listing.list.useQuery(undefined, {
    initialData: initialListings,
  });

  return (
    <DataTable
      columns={columns}
      data={listings}
      options={{ pinnedColumns: { left: 1, right: 1 } }}
    />
  );
}
