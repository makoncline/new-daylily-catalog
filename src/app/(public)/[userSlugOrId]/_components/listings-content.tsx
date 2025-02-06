"use client";

import { type RouterOutputs } from "@/trpc/react";
import { type ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ListingsTable } from "./listings-table";
import { ListingsToolbar } from "./listings-toolbar";
import { NoResults } from "./no-results";
import { H2 } from "@/components/typography";
import { baseListingColumns } from "@/app/dashboard/listings/_components/columns";
import { ListsSection } from "./lists-section";
import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { resetTableState } from "@/lib/table-utils";

type Listing = RouterOutputs["public"]["getListings"][number];
type Profile = RouterOutputs["public"]["getProfile"];
type ProfileLists = NonNullable<Profile>["lists"];

interface ListingsContentProps {
  lists: ProfileLists;
  listings: Listing[];
  isLoading: boolean;
}

const columns = [...baseListingColumns] as ColumnDef<Listing>[];

export function ListingsContent({
  lists,
  listings,
  isLoading,
}: ListingsContentProps) {
  // Initialize table with listings
  const table = useDataTable({
    data: listings,
    columns,
    storageKey: "public-catalog-listings-table",
    config: {
      state: {
        rowSelection: {},
      },
    },
  });

  const listsColumn = table.getColumn("lists");
  const columnFilters = table.getState().columnFilters;

  // Reset pagination and other filters when list filters change
  useEffect(() => {
    const listsFilter = columnFilters.find((filter) => filter.id === "lists");
    if (listsFilter) {
      resetTableState(table, { keepColumnFilters: true });
    }
  }, [columnFilters, table]);

  // Memoize list options calculation
  const listOptions = useMemo(() => {
    const listCounts = new Map<string, number>();

    // Count listings per list in a single pass
    listings?.forEach((listing: Listing) => {
      if (!listing?.lists) return;

      listing.lists.forEach((list: { id: string; title: string }) => {
        const count = listCounts.get(list.id) ?? 0;
        listCounts.set(list.id, count + 1);
      });
    });

    return (lists ?? []).map((list) => ({
      label: list.title,
      value: list.id,
      count: listCounts.get(list.id) ?? 0,
    }));
  }, [lists, listings]);

  return (
    <div className="space-y-8">
      <ListsSection lists={lists} column={listsColumn} table={table} />

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
            <ListingsToolbar
              table={table}
              listsColumn={listsColumn}
              listOptions={listOptions}
            />
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
          <ListingsTable table={table} />
        </DataTableLayout>
      </div>
    </div>
  );
}
