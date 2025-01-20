"use server";

import { api } from "@/trpc/server";
import { ListListingsTable } from "./_components/list-listings-table";
import { notFound } from "next/navigation";
import { PageHeader } from "../../_components/page-header";
import { ListForm } from "@/components/forms/list-form";
import { AddListingsSection } from "./_components/add-listings-section";

interface ListPageProps {
  params: {
    listId: string;
  };
}

export default async function ListPage({ params }: ListPageProps) {
  const list = await api.list.get({ id: params.listId });

  if (!list) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        heading={`Manage List: ${list.name}`}
        text="Manage list details and organize your listings."
      />
      <ListForm listId={params.listId} />
      <AddListingsSection listId={params.listId} />
      <ListListingsTable listId={params.listId} />
    </div>
  );
}
