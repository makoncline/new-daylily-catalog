"use server";

import { api } from "@/trpc/server";
import { CreateListButton } from "./_components/create-list-button";
import { ListsTable } from "./_components/lists-table";
import { PageHeader } from "../_components/page-header";

export default async function ListsPage() {
  const initialLists = await api.list.list();
  return (
    <>
      <PageHeader
        heading="Lists"
        text="Organize your daylilies into collections."
      >
        <CreateListButton />
      </PageHeader>

      <ListsTable initialLists={initialLists} />
    </>
  );
}
