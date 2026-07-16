"use client";

import {
  Activity,
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { CreateListButton } from "./_components/create-list-button";
import {
  CreateListSurface,
  useCreateList,
} from "./_components/create-list-dialog";
import { ListsTable } from "./_components/lists-table";
import { PageHeader } from "@/components/page-header";
import {
  EditListSurface,
  useEditList,
} from "./_components/edit-list-dialog";

export default function ListsPage() {
  const { closeEditList, editingId } = useEditList();
  const {
    canCreateList,
    closeCreateList,
    finishCreateList,
    isCreateRequested,
    isEligibilityLoading,
  } = useCreateList();
  const isCreating = isCreateRequested && canCreateList;
  const isShowingSurface = isCreating || Boolean(editingId);
  const dashboardScrollYRef = useRef(0);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    if (
      isCreateRequested &&
      !isEligibilityLoading &&
      !canCreateList
    ) {
      closeCreateList();
    }
  }, [
    canCreateList,
    closeCreateList,
    isCreateRequested,
    isEligibilityLoading,
  ]);

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
      wasEditingRef.current = false;
      window.scrollTo({ top: dashboardScrollYRef.current });
      const focusTarget = returnFocusRef.current?.isConnected
        ? returnFocusRef.current
        : dashboardRef.current;
      focusTarget?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [isShowingSurface]);

  const rememberDashboardState = (event: ReactMouseEvent) => {
    dashboardScrollYRef.current = window.scrollY;
    const openedFromRow =
      event.target instanceof Element &&
      event.target.closest('[data-testid="list-row-action-edit"]');
    returnFocusRef.current = openedFromRow
      ? document.querySelector<HTMLElement>(
          '[data-testid="list-row-actions-trigger"][data-state="open"]',
        )
      : null;
  };

  return (
    <>
      <Activity mode={isShowingSurface ? "hidden" : "visible"}>
        <div
          ref={dashboardRef}
          className="space-y-4"
          onClickCapture={rememberDashboardState}
          tabIndex={-1}
        >
          <PageHeader
            heading="Lists"
            text="Organize your daylilies into collections."
          >
            <CreateListButton />
          </PageHeader>

          <ListsTable />
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
