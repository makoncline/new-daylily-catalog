"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { NoResults } from "@/app/(public)/[userSlugOrId]/_components/no-results";
import { baseListingColumns } from "@/app/dashboard/listings/_components/columns";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { H2, Muted } from "@/components/typography";
import { useDataTable } from "@/hooks/use-data-table";
import {
  type PublicCatalogListing,
  type PublicCatalogSearchContentProps,
} from "./public-catalog-search-types";
import { PublicCatalogSearchTable } from "./public-catalog-search-table";
import { PublicCatalogSearchToolbar } from "./public-catalog-search-toolbar";

const columns = [...baseListingColumns] as ColumnDef<PublicCatalogListing>[];

export function PublicCatalogSearchContent({
  lists,
  listings,
  isLoading,
  totalListingsCount,
}: PublicCatalogSearchContentProps) {
  const table = useDataTable({
    data: listings,
    columns,
    storageKey: "public-catalog-listings-table",
  });

  const listsColumn = table.getColumn("lists") ?? null;

  const listOptions = useMemo(() => {
    const listCounts = new Map<string, number>();

    listings.forEach((listing: PublicCatalogListing) => {
      listing.lists.forEach((list: { id: string; title: string }) => {
        const count = listCounts.get(list.id) ?? 0;
        listCounts.set(list.id, count + 1);
      });
    });

    return lists.map((list) => ({
      label: list.title,
      value: list.id,
      count: listCounts.get(list.id) ?? 0,
    }));
  }, [lists, listings]);

  return (
    <div className="space-y-8">
      <div id="listings" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <H2 className="text-2xl">Listings</H2>
            <Muted>{totalListingsCount.toLocaleString()} total</Muted>
          </div>
          {isLoading && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more listings...</span>
            </div>
          )}
        </div>

        <DataTableLayout
          table={table}
          toolbar={
            <div id="lists">
              <PublicCatalogSearchToolbar
                table={table}
                listsColumn={listsColumn}
                listOptions={listOptions}
              />
            </div>
          }
          pagination={<DataTablePagination table={table} />}
          noResults={
            <NoResults
              filtered={
                table.getState().globalFilter !== "" ||
                table.getState().columnFilters.length > 0
              }
            />
          }
        >
          <PublicCatalogSearchTable table={table} />
        </DataTableLayout>
      </div>
    </div>
  );
}
