"use client";

import {
  ListingForm,
  type ListingFormHandle,
} from "@/components/forms/listing-form";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { atom } from "jotai";
import { ArrowLeft } from "lucide-react";
import { Suspense, useLayoutEffect, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useAtomDialogSearchParam } from "@/hooks/use-dialog-search-param";
import { useSaveBeforeNavigate } from "@/hooks/use-save-before-navigate";
import { Button } from "@/components/ui/button";
import { ErrorFallback } from "@/components/error-fallback";
import { PageHeader } from "@/components/page-header";

/**
 * Atom for editing state
 */
export const editingListingIdAtom = atom<string | null>(null);

/**
 * Custom hook for editing listings with Jotai state management.
 * Provides methods to open/close the edit dialog and syncs state with URL parameters.
 *
 * - URL parameters are read ONLY on initial load
 * - State changes write to URL parameters for bookmarking/sharing
 */
export const useEditListing = () => {
  const { close, open, value } = useAtomDialogSearchParam({
    atom: editingListingIdAtom,
    history: "push",
    paramName: "editing",
    scroll: false,
  });

  return {
    editListing: (id: string) => {
      open(id);
    },
    closeEditListing: () => {
      close();
    },
    editingId: value,
  };
};

/**
 * Full-page surface for editing a listing without modal viewport geometry.
 * Automatically saves changes before returning to the listings table.
 */
export function EditListingSurface({
  listingId,
  onClose,
}: {
  listingId: string;
  onClose: () => void;
}) {
  const formRef = useRef<ListingFormHandle | null>(null);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const surfaceRef = useRef<HTMLElement | null>(null);
  useSaveBeforeNavigate(formRef, "navigate");

  const handleBack = async () => {
    const didSave = await formRef.current?.saveChanges("close");
    if (didSave === false) {
      return;
    }

    onClose();
  };

  useLayoutEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true });
    const shellElements = [
      ...document.querySelectorAll<HTMLElement>('[data-sidebar="sidebar"]'),
      surfaceRef.current
        ?.closest("main")
        ?.querySelector<HTMLElement>(":scope > header"),
      document.querySelector<HTMLElement>(
        '[data-testid="dashboard-billing-alert"]',
      ),
    ].filter((element): element is HTMLElement => Boolean(element));

    shellElements.forEach((element) => {
      element.inert = true;
    });
    return () => {
      shellElements.forEach((element) => {
        element.inert = false;
      });
    };
  }, []);

  return (
    <section
      ref={surfaceRef}
      aria-label="Edit listing"
      className="mx-auto w-full max-w-3xl pb-8"
    >
      <PageHeader heading="Edit Listing" text="Make changes to your listing.">
        <Button
          ref={backButtonRef}
          type="button"
          variant="outline"
          onClick={() => void handleBack()}
        >
          <ArrowLeft aria-hidden="true" />
          Back to listings
        </Button>
      </PageHeader>

      <ErrorBoundary fallback={<ErrorFallback resetErrorBoundary={onClose} />}>
        <Suspense fallback={<ListingFormSkeleton />}>
          <ListingForm
            listingId={listingId}
            onDelete={onClose}
            onSave={onClose}
            formRef={formRef}
          />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}
