"use client";

import {
  ListingForm,
  type ListingFormHandle,
} from "@/components/forms/listing-form";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { atom } from "jotai";
import { useAtomDialogSearchParam } from "@/hooks/use-dialog-search-param";
import { ManagedEditDialog } from "@/app/dashboard/_components/managed-edit-dialog";

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
 * Dialog component for editing a listing.
 * Opens when editingListingIdAtom has a valid listing ID.
 * Automatically saves changes when closing.
 */
export function EditListingDialog() {
  const { editingId, closeEditListing } = useEditListing();

  return (
    <ManagedEditDialog<ListingFormHandle>
      description="Make changes to your listing here."
      entityId={editingId}
      fallback={<ListingFormSkeleton />}
      isOpen={!!editingId}
      onClose={closeEditListing}
      renderForm={(id, formRef, onClose) => (
        <ListingForm listingId={id} onDelete={onClose} formRef={formRef} />
      )}
      title="Edit Listing"
    />
  );
}
