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
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { P } from "@/components/typography";
import { atom, useAtom } from "jotai";
import { useSaveBeforeNavigate } from "@/hooks/use-save-before-navigate";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editingId, setEditingId] = useAtom(editingListingIdAtom);
  const hasInitializedRef = useRef(false);

  // Sync atom state to URL for persistence
  useEffect(() => {
    if (!hasInitializedRef.current) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (editingId) {
      params.set("editing", editingId);
    } else {
      params.delete("editing");
    }

    const nextQuery = params.toString();
    const newUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    const currentQuery = searchParams.toString();
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;

    if (newUrl !== currentUrl) {
      router.push(newUrl);
    }
  }, [editingId, pathname, router, searchParams]);

  // Initialize from URL on first load
  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    const urlEditingId = searchParams.get("editing");
    if (urlEditingId) {
      setEditingId(urlEditingId);
    }

    hasInitializedRef.current = true;
  }, [searchParams, setEditingId]);

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
