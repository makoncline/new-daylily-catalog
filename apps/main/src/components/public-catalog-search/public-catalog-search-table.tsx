"use client";

import { type Table } from "@tanstack/react-table";
import { CatalogListingGrid } from "@/components/catalog-listing-grid";
import { ListingCard, ListingCardAction } from "@/components/listing-card";
import { useListingDialogQueryState } from "@/hooks/use-listing-dialog-query-state";
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
    <CatalogListingGrid desktopColumns={desktopColumns}>
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
    </CatalogListingGrid>
  );
}
