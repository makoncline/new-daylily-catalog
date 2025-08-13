"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListingForm } from "@/components/forms/listing-form";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { useSearchParams, useRouter } from "next/navigation";
import { useRef, useEffect, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { P } from "@/components/typography";
import { atom, useAtom } from "jotai";

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
  const searchParams = useSearchParams();
  const [editingId, setEditingId] = useAtom(editingListingIdAtom);
  const hasInitialized = useRef(false);

  // Sync atom state to URL for persistence
  useEffect(() => {
    if (!hasInitialized.current) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (editingId) {
      params.set("editing", editingId);
    } else {
      params.delete("editing");
    }

    const newUrl = `?${params.toString()}`;
    const currentUrl = searchParams.toString()
      ? `?${searchParams.toString()}`
      : "";

    if (newUrl !== currentUrl) {
      router.push(newUrl);
    }
  }, [editingId, router, searchParams]);

  // Initialize from URL on first load
  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    const urlEditingId = searchParams.get("editing");
    if (urlEditingId) {
      setEditingId(urlEditingId);
    }

    hasInitialized.current = true;
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
  const formRef = useRef<{ saveChanges: () => Promise<void> }>();
  const isOpen = !!editingId;

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      // Save any pending changes before closing
      await formRef.current?.saveChanges?.();
      closeEditListing();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        data-testid="edit-listing-dialog"
      >
        <DialogHeader>
          <DialogTitle data-testid="edit-listing-title">
            Edit Listing
          </DialogTitle>
          <P className="text-sm text-muted-foreground">
            Make changes to your listing here.
          </P>
        </DialogHeader>

        <div className="h-[calc(100%-4rem)]">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
