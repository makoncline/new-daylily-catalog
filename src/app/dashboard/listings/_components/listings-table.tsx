"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { getColumns } from "./columns";
import { api, type RouterOutputs } from "@/trpc/react";
import { CreateListingButton } from "./create-listing-button";
import { useEditListing } from "./edit-listing-dialog";
import { useDataTable } from "@/hooks/use-data-table";
import { type Table } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableDownload } from "@/components/data-table";
import { APP_CONFIG } from "@/config/constants";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { DataTableLayoutSkeleton } from "@/components/data-table/data-table-layout";

type List = RouterOutputs["list"]["list"][number];
type Listing = RouterOutputs["listing"]["list"][number];

interface ListingsTableToolbarProps {
  table: Table<Listing>;
  lists: List[];
  listings: Listing[];
}

function ListingsTableToolbar({
  table,
  lists,
  listings,
}: ListingsTableToolbarProps) {
  const listsColumn = table.getColumn("lists");
  const listOptions = lists.map((list) => ({
    label: list.title,
    value: list.id,
    count: listings?.filter((listing) =>
      listing.lists.some(
        (listingList: { id: string }) => listingList.id === list.id,
      ),
    ).length,
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end sm:hidden">
        <DataTableViewOptions table={table} />
      </div>

      <div className="flex flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <DataTableGlobalFilter
              table={table}
              placeholder="Filter listings..."
            />
            <DataTableFacetedFilter
              column={listsColumn}
              title="Lists"
              options={listOptions}
              table={table}
            />
          </div>

          <div className="flex items-center gap-2">
            <DataTableFilteredCount table={table} />
            <DataTableFilterReset table={table} />
          </div>
        </div>

        <div className="hidden flex-1 sm:block" />
        <div className="hidden sm:block">
          <DataTableViewOptions table={table} />
        </div>
      </div>
    </div>
  );
}

export function ListingsTable() {
  const { data: listings, isLoading } = api.listing.list.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const { data: lists } = api.list.list.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const { editListing } = useEditListing();

  const columns = getColumns(editListing);

  const table = useDataTable({
    data: listings ?? [],
    columns,
    storageKey: "listings-table",
    pinnedColumns: {
      left: ["select", "title"],
      right: ["actions"],
    },
    config: {
      enableRowSelection: true,
    },
    initialStateOverrides: {
      pagination: {
        pageSize: APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT,
      },
    },
  });

  if (isLoading) {
    return <DataTableLayoutSkeleton />;
  }

  if (!listings?.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create your first listing to start selling"
        action={<CreateListingButton />}
      />
    );
  }

  return (
    <div data-testid="listings-table">
      <DataTableLayout
        table={table}
        toolbar={
          lists ? (
            <ListingsTableToolbar
              table={table}
              lists={lists}
              listings={listings}
            />
          ) : null
        }
        pagination={
          <>
            <DataTablePagination
              table={table}
              pageSizeOptions={
                APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS
              }
            />
            <DataTableDownload table={table} filenamePrefix="listings" />
          </>
        }
        noResults={
          <EmptyState
            title="No listings found"
            description="Try adjusting your filters or create a new listing"
            action={<CreateListingButton />}
          />
        }
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}
