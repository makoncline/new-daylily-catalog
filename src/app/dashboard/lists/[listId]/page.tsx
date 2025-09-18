"use client";

import React from "react";
import { api } from "@/trpc/react";
import { ListListingsTable } from "./_components/list-listings-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { ListForm } from "@/components/forms/list-form";
import { AddListingsSection } from "./_components/add-listings-section";
import { ListFormSkeleton } from "@/components/forms/list-form-skeleton";
import { DataTableLayoutSkeleton } from "@/components/data-table/data-table-layout";

interface ListPageProps {
  params: Promise<{
    listId: string;
  }>;
}

export default function ListPage({ params }: ListPageProps) {
  const { listId } = React.use(params);
  const { data: list, isLoading } = api.list.get.useQuery({
    id: listId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader heading="Manage List" text="Loading list details..." />
        <ListFormSkeleton />
        <DataTableLayoutSkeleton />
      </div>
    );
  }

  if (!list) {
    // Handle not found client-side
    // This could redirect to a 404 page or show an error message
    return <div className="p-4">List not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        heading={`Manage List: ${list.title}`}
        text="Manage list details and organize your listings."
      />
      <ListForm listId={listId} />
      <AddListingsSection listId={listId} />
      <ListListingsTable listId={listId} />
    </div>
  );
}
