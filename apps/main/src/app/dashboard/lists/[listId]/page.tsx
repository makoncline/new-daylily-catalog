"use client";

import React from "react";
import { ListListingsTable } from "./_components/list-listings-table";
import { PageHeader } from "../../_components/page-header";
import { ListForm, type ListFormHandle } from "@/components/forms/list-form";
import { AddListingsSection } from "./_components/add-listings-section";
import { useSaveBeforeNavigate } from "@/hooks/use-save-before-navigate";
import { useListResource } from "@/app/dashboard/_lib/dashboard-db/use-list-resource";
import { loadMissingList } from "@/app/dashboard/_lib/dashboard-db/lists-collection";

interface ListPageProps {
  params: Promise<{
    listId: string;
  }>;
}

export default function ListPage({ params }: ListPageProps) {
  const { listId } = React.use(params);

  return <ManageListPageLive listId={listId} />;
}

export function ManageListPageLive({ listId }: { listId: string }) {
  const formRef = React.useRef<ListFormHandle | null>(null);
  useSaveBeforeNavigate(formRef, "navigate");
  const markListNeedsCommit = React.useCallback(() => {
    formRef.current?.markNeedsCommit();
  }, []);

  const { isReady, list } = useListResource(listId);
  const [unavailableId, setUnavailableId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!isReady || list || unavailableId === listId) return;
    let active = true;
    void loadMissingList(listId).catch(() => {
      if (active) setUnavailableId(listId);
    });
    return () => {
      active = false;
    };
  }, [isReady, list, listId, unavailableId]);

  if (!isReady || (!list && unavailableId !== listId)) {
    return <div className="p-4">Loading list...</div>;
  }
  if (!list) {
    return <div className="p-4">List not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        heading={`Manage List: ${list.title}`}
        text="Manage list details and organize your listings."
      />
      <ListForm listId={listId} formRef={formRef} />
      <AddListingsSection
        listId={listId}
        onMutationSuccess={markListNeedsCommit}
      />
      <ListListingsTable
        listId={listId}
        onMutationSuccess={markListNeedsCommit}
      />
    </div>
  );
}
