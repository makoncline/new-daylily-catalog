"use client";

import {
  Activity,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  type SyntheticEvent,
} from "react";
import { CreateListButton } from "./_components/create-list-button";
import { CreateListSurface } from "./_components/create-list-dialog";
import { ListsTable } from "./_components/lists-table";
import { PageHeader } from "@/components/page-header";
import { EditListSurface } from "./_components/edit-list-dialog";
import { useCreateList, useEditList } from "./_hooks/use-list-surface-state";

export default function ListsPage() {
  const { closeEditList, editingId, editList } = useEditList();
  const {
    canCreateList,
    closeCreateList,
    finishCreateList,
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
  const isCreating = isCreateRequested && canCreateList;
  const isShowingSurface = isCreating || Boolean(editingId);
  const dashboardScrollYRef = useRef(0);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasEditingRef = useRef(false);
  const restoreFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isCreateRequested && !isEligibilityLoading && !canCreateList) {
      closeCreateList();
    }
  }, [canCreateList, closeCreateList, isCreateRequested, isEligibilityLoading]);

  useLayoutEffect(() => {
    if (isShowingSurface) {
      wasEditingRef.current = true;
      window.scrollTo({ top: 0 });
      return;
    }

    if (!wasEditingRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      restoreFrameRef.current = null;
      wasEditingRef.current = false;
      window.scrollTo({ top: dashboardScrollYRef.current });
      const focusTarget = returnFocusRef.current?.isConnected
        ? returnFocusRef.current
        : dashboardRef.current;
      focusTarget?.focus({ preventScroll: true });
    });

    restoreFrameRef.current = frame;
    return () => {
      cancelAnimationFrame(frame);
      restoreFrameRef.current = null;
    };
  }, [isShowingSurface]);

  const rememberDashboardState = (event: SyntheticEvent) => {
    if (restoreFrameRef.current !== null) {
      cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
      wasEditingRef.current = false;
    }
    dashboardScrollYRef.current = window.scrollY;
    const openedFromRow =
      event.target instanceof Element &&
      event.target.closest('[data-testid="list-row-action-edit"]');
    if (!openedFromRow && event.target instanceof Element) {
      const button = event.target.closest<HTMLElement>("button");
      if (button) returnFocusRef.current = button;
    }
  };

  return (
    <>
      <Activity mode={isShowingSurface ? "hidden" : "visible"}>
        <div
          ref={dashboardRef}
          className="flex min-w-0 flex-col gap-4"
          onPointerDownCapture={rememberDashboardState}
          onFocusCapture={rememberDashboardState}
          tabIndex={-1}
        >
          <PageHeader
            heading="Lists"
            text="Organize your daylilies into collections."
          >
            <CreateListButton onCreate={openCreateList} />
          </PageHeader>

          <ListsTable onEdit={handleEdit} onCreate={openCreateList} />
        </div>
      </Activity>

      {isCreating ? (
        <CreateListSurface
          onClose={closeCreateList}
          onCreated={finishCreateList}
        />
      ) : editingId ? (
        <EditListSurface listId={editingId} onClose={closeEditList} />
      ) : null}
    </>
  );
}
