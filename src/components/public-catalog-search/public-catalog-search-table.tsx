"use client";

import { ListingCard } from "@/components/listing-card";
import { type Table } from "@tanstack/react-table";
import { type PublicCatalogListing } from "./public-catalog-search-types";

interface PublicCatalogSearchTableProps {
  table: Table<PublicCatalogListing>;
}

export function PublicCatalogSearchTable({ table }: PublicCatalogSearchTableProps) {
  const rows = table.getRowModel().rows;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {rows.map((row) => (
        <div key={row.original.id}>
          <ListingCard listing={row.original} />
        </div>
      ))}
    </div>
  );
}
