"use client";

import { type Table } from "@tanstack/react-table";
import { ListingCard, ListingCardAction } from "@/components/listing-card";
import { useListingDialogQueryState } from "@/hooks/use-listing-dialog-query-state";
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
  const { openListing } = useListingDialogQueryState();
  const rows = table.getRowModel().rows;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2",
        desktopColumns === 2
          ? "lg:grid-cols-2 xl:grid-cols-2"
          : "lg:grid-cols-3 xl:grid-cols-3",
      )}
    >
      {rows.map((row, index) => (
        <div key={row.original.id}>
          <ListingCard listing={row.original} priority={index < desktopColumns}>
            <ListingCardAction
              onClick={() => openListing(row.original.id)}
              aria-label={`View ${row.original.title}`}
            />
          </ListingCard>
        </div>
      ))}
    </div>
  );
}
