"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ListingForm,
  type ListingFormHandle,
} from "@/components/forms/listing-form";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { P } from "@/components/typography";
import { atom, useAtom } from "jotai";
import { useSaveBeforeNavigate } from "@/hooks/use-save-before-navigate";
import { useEditingQueryParamSync } from "@/hooks/use-editing-query-param-sync";

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
  const [editingId, setEditingId] = useAtom(editingListingIdAtom);
  useEditingQueryParamSync({
    editingId,
    setEditingId,
    navigationMethod: "push",
  });

  return {
    editListing: (id: string) => {
      setEditingId(id);
    },
    closeEditListing: () => {
      setEditingId(null);
    },
    editingId,
  };
};

/**
 * Dialog component for editing a listing.
 * Opens when editingListingIdAtom has a valid listing ID.
 * Automatically saves changes when closing.
 */
export function EditListingDialog() {
  const { editingId, closeEditListing } = useEditListing();
  const formRef = useRef<ListingFormHandle | null>(null);
  const isOpen = !!editingId;
  useSaveBeforeNavigate(formRef, "navigate", isOpen);

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      // Save any pending changes before closing
      const didSave = await formRef.current?.saveChanges("close");
      if (didSave === false) {
        return;
      }
      closeEditListing();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
          <P className="text-muted-foreground text-sm">
            Make changes to your listing here.
          </P>
        </DialogHeader>

        {editingId && (
          <ErrorBoundary
            fallback={<ErrorFallback resetErrorBoundary={closeEditListing} />}
          >
            <Suspense fallback={<ListingFormSkeleton />}>
              <ListingForm
                listingId={editingId}
                onDelete={closeEditListing}
                formRef={formRef}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </DialogContent>
    </Dialog>
  );
}
