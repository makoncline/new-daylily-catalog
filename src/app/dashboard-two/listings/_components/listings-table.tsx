"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { getColumns } from "./columns";
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
import type { ListingRow } from "./types";

interface ListingsTableToolbarProps {
  table: Table<ListingRow>;
  lists: ListingRow["lists"];
  listings: ListingRow[];
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
      listing.lists.some((ll) => ll.id === list.id),
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

export function ListingsTable({
  data,
  lists,
  isLoading,
  onEdit,
  onDelete,
  storageKey = "listings-table-two",
}: {
  data: ListingRow[];
  lists: ListingRow["lists"];
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  storageKey?: string;
}) {
  const columns = React.useMemo(
    () => getColumns(onEdit, onDelete),
    [onEdit, onDelete],
  );

  const table = useDataTable({
    data: data ?? [],
    columns,
    storageKey,
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

  if (!data?.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create your first listing to start selling"
      />
    );
  }

  return (
    <DataTableLayout
      table={table}
      toolbar={
        <ListingsTableToolbar
          table={table}
          lists={lists ?? []}
          listings={data ?? []}
        />
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
        />
      }
    >
      <DataTable table={table} />
    </DataTableLayout>
  );
}
