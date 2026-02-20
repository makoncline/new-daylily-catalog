"use client";

import { type Table } from "@tanstack/react-table";
import { ListingCard } from "@/components/listing-card";
import { cn } from "@/lib/utils";
import { type PublicCatalogListing } from "./public-catalog-search-types";

interface PublicCatalogSearchTableProps {
  table: Table<PublicCatalogListing>;
  desktopColumns: 2 | 3;
}

export function PublicCatalogSearchTable({
  table,
  desktopColumns,
}: PublicCatalogSearchTableProps) {
  const rows = table.getRowModel().rows;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2",
        desktopColumns === 2 ? "lg:grid-cols-2 xl:grid-cols-2" : "lg:grid-cols-3 xl:grid-cols-3",
      )}
    >
      {rows.map((row) => (
        <div key={row.original.id}>
          <ListingCard listing={row.original} />
        </div>
      ))}
    </div>
  );
}
