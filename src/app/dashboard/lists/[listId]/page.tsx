"use client";

import React from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { ListListingsTable } from "./_components/list-listings-table";
import { PageHeader } from "../../_components/page-header";
import {
  ListForm,
  type ListFormHandle,
} from "@/components/forms/list-form";
import { AddListingsSection } from "./_components/add-listings-section";
import {
  listsCollection,
  type ListCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { getQueryClient } from "@/trpc/query-client";
import { usePendingChangesGuard } from "@/hooks/use-pending-changes-guard";

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
  const formRef = React.useRef<ListFormHandle | null>(null);
  usePendingChangesGuard(formRef, "navigate");
  const [hasExternalUnsavedChanges, setHasExternalUnsavedChanges] =
    React.useState(false);
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
  const markExternalUnsavedChanges = React.useCallback(() => {
    setHasExternalUnsavedChanges(true);
  }, []);
  const clearExternalUnsavedChanges = React.useCallback(() => {
    setHasExternalUnsavedChanges(false);
  }, []);

  React.useEffect(() => {
    setHasExternalUnsavedChanges(false);
  }, [listId]);

  if (!list) {
    return <div className="p-4">List not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        heading={`Manage List: ${list.title}`}
        text="Manage list details and organize your listings."
      />
      <ListForm
        listId={listId}
        formRef={formRef}
        hasExternalUnsavedChanges={hasExternalUnsavedChanges}
        onExternalChangesSaved={clearExternalUnsavedChanges}
      />
      <AddListingsSection
        listId={listId}
        onMutationSuccess={markExternalUnsavedChanges}
      />
      <ListListingsTable
        listId={listId}
        onMutationSuccess={markExternalUnsavedChanges}
      />
    </div>
  );
}
