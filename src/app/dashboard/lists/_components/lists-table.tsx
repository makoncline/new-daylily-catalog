"use client";

import { type List } from "@prisma/client";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns";
import { api } from "@/trpc/react";
import { ListsTableSkeleton } from "./lists-table-skeleton";

export function ListsTable() {
  const { data: lists, isLoading } = api.list.list.useQuery();

  if (isLoading) {
    return <ListsTableSkeleton />;
  }

  if (!lists) return null;

  return (
    <DataTable
      columns={columns}
      data={lists}
      options={{
        pinnedColumns: {
          left: 1,
          right: 1,
        },
        pagination: {
          pageSize: 10,
          pageIndex: 0,
        },
      }}
    />
  );
}
