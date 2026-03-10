"use client";

import { CreateListButton } from "./_components/create-list-button";
import { ListsTable } from "./_components/lists-table";
import { PageHeader } from "../_components/page-header";
import { EditListDialog } from "./_components/edit-list-dialog";

export default function ListsPage() {
  return (
    <>
      <PageHeader
        heading="Lists"
        text="Organize your daylilies into collections."
      >
        <CreateListButton />
      </PageHeader>

      <ListsTable />

      <EditListDialog />
    </>
  );
}
