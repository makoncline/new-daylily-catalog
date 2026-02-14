"use client";

import React from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { ListListingsTable } from "./_components/list-listings-table";
import { PageHeader } from "../../_components/page-header";
import { ListForm } from "@/components/forms/list-form";
import { AddListingsSection } from "./_components/add-listings-section";
import {
  listsCollection,
  type ListCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { getQueryClient } from "@/trpc/query-client";

interface ListPageProps {
  params: Promise<{
    listId: string;
  }>;
}

export default function ListPage({ params }: ListPageProps) {
  const { listId } = React.use(params);

  return <ManageListPageLive listId={listId} />;
}

function ManageListPageLive({ listId }: { listId: string }) {
  const { data: liveLists = [], isReady } = useLiveQuery(
    (q) =>
      q.from({ list: listsCollection }).where(({ list }) => eq(list.id, listId)),
    [listId],
  );

  const queryClient = getQueryClient();
  const seededLists =
    queryClient.getQueryData<ListCollectionItem[]>(["dashboard-db", "lists"]) ??
    [];
  const seededList = seededLists.find((row) => row.id === listId) ?? null;

  const list = isReady ? (liveLists[0] ?? seededList) : seededList;

  if (!list) {
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
