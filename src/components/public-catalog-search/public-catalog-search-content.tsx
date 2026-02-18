"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { baseListingColumns } from "@/app/dashboard/listings/_components/columns";
import { H2 } from "@/components/typography";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTable } from "@/hooks/use-data-table";
import { resetTableState } from "@/lib/table-utils";
import { NoResults } from "@/app/(public)/[userSlugOrId]/_components/no-results";
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
}: PublicCatalogSearchContentProps) {
  const table = useDataTable({
    data: listings,
    columns,
    storageKey: "public-catalog-listings-table",
  });

  const listsColumn = table.getColumn("lists") ?? null;
  const columnFilters = table.getState().columnFilters;

  useEffect(() => {
    const listsFilter = columnFilters.find((filter) => filter.id === "lists");
    if (listsFilter) {
      resetTableState(table, { keepColumnFilters: true });
    }
  }, [columnFilters, table]);

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
          <H2 className="text-2xl">Listings</H2>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
