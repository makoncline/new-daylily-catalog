"use client";

import {
  Activity,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  type SyntheticEvent,
} from "react";
import { CreateListingButton } from "./_components/create-listing-button";
import {
  CreateListingSurface,
  useCreateListing,
} from "./_components/create-listing-dialog";
import { ListingsTable } from "./_components/listings-table";
import {
  EditListingSurface,
  useEditListing,
} from "./_components/edit-listing-dialog";
import { PageHeader } from "@/components/page-header";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";

export default function ListingsPage() {
  const { closeEditListing, editingId, editListing } = useEditListing();
  const {
    closeCreateListing,
    finishCreateListing,
    isCreating,
    openCreateListing,
  } = useCreateListing();
  const editListingRef = useRef(editListing);
  useLayoutEffect(() => {
    editListingRef.current = editListing;
  }, [editListing]);
  const handleEdit = useCallback((id: string) => {
    editListingRef.current(id);
  }, []);
  const isShowingSurface = isCreating || Boolean(editingId);
  const dashboardScrollYRef = useRef(0);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasEditingRef = useRef(false);
  const restoreFrameRef = useRef<number | null>(null);

  useEffect(() => {
    logDashboardTiming("listings-page.mounted");
  }, []);

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
      event.target.closest('[data-testid="listing-row-action-edit"]');
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
          data-testid="listings-dashboard"
          className="flex flex-col gap-4"
          onPointerDownCapture={rememberDashboardState}
          onFocusCapture={rememberDashboardState}
          tabIndex={-1}
        >
          <PageHeader
            heading="Listings"
            text="Manage and showcase your daylilies."
          >
            <CreateListingButton onCreate={openCreateListing} />
          </PageHeader>

          <ListingsTable onEdit={handleEdit} onCreate={openCreateListing} />
        </div>
      </Activity>

      {isCreating ? (
        <CreateListingSurface
          onClose={closeCreateListing}
          onCreated={finishCreateListing}
        />
      ) : editingId ? (
        <EditListingSurface listingId={editingId} onClose={closeEditListing} />
      ) : null}
    </>
  );
}
