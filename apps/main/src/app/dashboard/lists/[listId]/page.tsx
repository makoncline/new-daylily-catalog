"use client";

import React from "react";
import { ListListingsTable } from "./_components/list-listings-table";
import { PageHeader } from "../../_components/page-header";
import {
  ListForm,
  type ListFormHandle,
} from "@/components/forms/list-form";
import { AddListingsSection } from "./_components/add-listings-section";
import { useSaveBeforeNavigate } from "@/hooks/use-save-before-navigate";
import { useListResource } from "@/app/dashboard/_lib/dashboard-db/use-list-resource";

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

  const { list } = useListResource(listId);

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
