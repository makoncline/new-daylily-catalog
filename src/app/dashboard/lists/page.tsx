"use client";

import { api } from "@/trpc/react";
import { CreateListButton } from "./_components/create-list-button";
import { ListsTable } from "./_components/lists-table";
import { PageHeader } from "../_components/page-header";
import { EditListDialog } from "./_components/edit-list-dialog";
import { DataTableLayoutSkeleton } from "@/components/data-table/data-table-layout";

export default function ListsPage() {
  // Fetch lists data on the client side
  const { isLoading } = api.list.list.useQuery();

  return (
    <>
      <PageHeader
        heading="Lists"
        text="Organize your daylilies into collections."
      >
        <CreateListButton />
      </PageHeader>

      {isLoading ? <DataTableLayoutSkeleton /> : <ListsTable />}

      <EditListDialog />
    </>
  );
}
