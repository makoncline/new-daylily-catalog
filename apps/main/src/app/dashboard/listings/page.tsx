"use client";

import {
  Activity,
  useEffect,
  useLayoutEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
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
  const { closeEditListing, editingId } = useEditListing();
  const { closeCreateListing, finishCreateListing, isCreating } =
    useCreateListing();
  const isShowingSurface = isCreating || Boolean(editingId);
  const dashboardScrollYRef = useRef(0);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasEditingRef = useRef(false);

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
      event.target.closest('[data-testid="listing-row-action-edit"]');
    returnFocusRef.current = openedFromRow
      ? document.querySelector<HTMLElement>(
          '[data-testid="listing-row-actions-trigger"][data-state="open"]',
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
            heading="Listings"
            text="Manage and showcase your daylilies."
          >
            <CreateListingButton />
          </PageHeader>

          <ListingsTable />
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
