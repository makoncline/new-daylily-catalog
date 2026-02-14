"use client";

import * as React from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { columns } from "./columns";
import { CreateListButton } from "./create-list-button";
import { type Table } from "@tanstack/react-table";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { useDataTable } from "@/hooks/use-data-table";
import { APP_CONFIG, LIST_TABLE_COLUMN_NAMES } from "@/config/constants";
import {
  listsCollection,
  type ListCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { getQueryClient } from "@/trpc/query-client";

type List = ListCollectionItem;

interface ListsTableToolbarProps {
  table: Table<List>;
}

function ListsTableToolbar({ table }: ListsTableToolbarProps) {
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
              placeholder="Filter lists..."
            />
          </div>

          <div className="flex items-center gap-2">
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

function ListsTableLive() {
  const { data: baseLists = [], isReady } = useLiveQuery((q) =>
    q
      .from({ list: listsCollection })
      .orderBy(({ list }) => list.createdAt, "desc"),
  );

  const queryClient = getQueryClient();
  const seededLists =
    queryClient.getQueryData<List[]>(["dashboard-db", "lists"]) ?? [];

  const lists = isReady ? baseLists : seededLists;

  const table = useDataTable({
    data: lists,
    columns,
    storageKey: "lists-table",
    pinnedColumns: {
      left: ["title"],
      right: ["actions"],
    },
    columnNames: LIST_TABLE_COLUMN_NAMES,
  });

  if (!lists.length) {
    return <NoResults />;
  }

  return (
    <div data-testid="list-table">
      <DataTableLayout
        table={table}
        toolbar={<ListsTableToolbar table={table} />}
        pagination={
          <DataTablePagination
            table={table}
            pageSizeOptions={
              APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS
            }
          />
        }
        noResults={<NoResults filtered />}
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}

export function ListsTable() {
  return <ListsTableLive />;
}
