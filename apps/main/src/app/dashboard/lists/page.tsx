"use client";

import { useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { CreateListButton } from "./_components/create-list-button";
import { ListsTable } from "./_components/lists-table";
import { PageHeader } from "@/components/page-header";
import { useCreateList, useEditList } from "./_hooks/use-list-surface-state";

export default function ListsPage() {
  const { editList } = useEditList();
  const {
    canCreateList,
    closeCreateList,
    isCreateRequested,
    isEligibilityLoading,
    openCreateList,
  } = useCreateList();
  const editListRef = useRef(editList);
  useLayoutEffect(() => {
    editListRef.current = editList;
  }, [editList]);
  const handleEdit = useCallback((id: string) => {
    editListRef.current(id);
  }, []);
  useEffect(() => {
    if (isCreateRequested && !isEligibilityLoading && !canCreateList) {
      closeCreateList();
    }
  }, [canCreateList, closeCreateList, isCreateRequested, isEligibilityLoading]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        heading="Lists"
        text="Organize your daylilies into collections."
      >
        <CreateListButton onCreate={openCreateList} />
      </PageHeader>
      <ListsTable onEdit={handleEdit} onCreate={openCreateList} />
    </div>
  );
}
