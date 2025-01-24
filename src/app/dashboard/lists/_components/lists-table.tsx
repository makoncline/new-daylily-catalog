"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { columns } from "./columns";
import { api } from "@/trpc/react";
import { ListsTableSkeleton } from "./lists-table-skeleton";
import { CreateListButton } from "./create-list-button";
import { type Table } from "@tanstack/react-table";
import { type RouterOutputs } from "@/trpc/react";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { useDataTable } from "@/hooks/use-data-table";
import { LIST_TABLE_COLUMN_NAMES } from "@/config/constants";

type List = RouterOutputs["list"]["list"][number];

interface ListsTableToolbarProps {
  table: Table<List>;
}

function ListsTableToolbar({ table }: ListsTableToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <DataTableGlobalFilter table={table} placeholder="Filter lists..." />
        <DataTableFilterReset table={table} />
        <div className="flex-1" />
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}

function NoResults({ filtered = false }) {
  return (
    <EmptyState
      title={filtered ? "No lists found" : "No lists"}
      description={
        filtered
          ? "Try adjusting your filters or create a new list"
          : "Create a list to organize your daylilies"
      }
      action={<CreateListButton />}
    />
  );
}

export function ListsTable() {
  const { data: lists, isLoading } = api.list.list.useQuery();

  const table = useDataTable({
    data: lists ?? [],
    columns,
    storageKey: "lists-table",
    pinnedColumns: {
      left: ["title"],
      right: ["actions"],
    },
    columnNames: LIST_TABLE_COLUMN_NAMES,
  });

  if (isLoading) {
    return <ListsTableSkeleton />;
  }

  if (!lists?.length) {
    return <NoResults />;
  }

  return (
    <DataTableLayout
      table={table}
      toolbar={<ListsTableToolbar table={table} />}
      pagination={<DataTablePagination table={table} />}
      noResults={<NoResults filtered />}
    >
      <DataTable table={table} />
    </DataTableLayout>
  );
}
