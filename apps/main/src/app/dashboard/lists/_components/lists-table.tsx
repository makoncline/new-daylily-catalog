"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayoutSkeleton } from "@/components/data-table/data-table-layout";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FolderOpen } from "lucide-react";
import { getColumns } from "./columns";
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
import { DASHBOARD_DB_QUERY_KEYS } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-keys";
import { useSeededDashboardDbQuery } from "@/app/dashboard/_lib/dashboard-db/use-seeded-dashboard-db-query";

type List = ListCollectionItem;

interface ListsTableToolbarProps {
  table: Table<List>;
}

function ListsTableToolbar({ table }: ListsTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <DataTableGlobalFilter table={table} placeholder="Filter lists..." />
        <DataTableFilterReset table={table} />
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}

function NoResults({
  filtered = false,
  onCreate,
}: {
  filtered?: boolean;
  onCreate: () => void;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={2}>
          {filtered ? "No lists found" : "No lists"}
        </EmptyTitle>
        <EmptyDescription>
          {filtered
            ? "Adjust your filters or create a new list."
            : "Create a list to organize your daylilies."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreateListButton onCreate={onCreate} />
      </EmptyContent>
    </Empty>
  );
}

export function ListsTable({
  onEdit,
  onCreate,
}: {
  onEdit: (id: string) => void;
  onCreate: () => void;
}) {
  const columns = React.useMemo(() => getColumns(onEdit), [onEdit]);
  const { data: lists = [], isReady } = useSeededDashboardDbQuery<List>({
    query: (q) =>
      q
        .from({ list: listsCollection })
        .orderBy(({ list }) => list.createdAt, "desc"),
    queryKey: DASHBOARD_DB_QUERY_KEYS.lists,
  });

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

  if (!isReady && !lists.length)
    return (
      <div role="status" aria-label="Loading lists">
        <DataTableLayoutSkeleton />
      </div>
    );

  if (!lists.length) {
    return <NoResults onCreate={onCreate} />;
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
        noResults={<NoResults filtered onCreate={onCreate} />}
      >
        <DataTable table={table} />
      </DataTableLayout>
    </div>
  );
}
