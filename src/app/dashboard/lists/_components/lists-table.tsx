"use client";

import { type List } from "@prisma/client";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { columns } from "./columns";
import { api } from "@/trpc/react";
import { ListsTableSkeleton } from "./lists-table-skeleton";
import { CreateListButton } from "./create-list-button";

export function ListsTable() {
  const { data: lists, isLoading } = api.list.list.useQuery();

  if (isLoading) {
    return <ListsTableSkeleton />;
  }

  if (!lists?.length) {
    return (
      <EmptyState
        title="No lists"
        description="Create a list to organize your daylilies"
        action={<CreateListButton />}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={lists}
      options={{
        pinnedColumns: {
          left: 1,
          right: 1,
        },
      }}
    />
  );
}
