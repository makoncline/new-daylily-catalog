"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListingForm } from "@/components/forms/listing-form";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { ErrorFallback } from "@/components/error-fallback";
import { reportError } from "@/lib/error-utils";
import { P } from "@/components/typography";

export const useEditListing = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  const setEditingId = (id: string | null) => {
    // Create a new URL with the current pathname and search params
    const url = new URL(window.location.href);

    // Update the editing parameter
    if (id) {
      url.searchParams.set("editing", id);
    } else {
      url.searchParams.delete("editing");
    }

    // Use router.push to update the URL and trigger a client-side navigation
    router.push(url.pathname + url.search);
  };

  const getEditingId = () => searchParams.get("editing");

  return {
    editListing: (id: string) => {
      setEditingId(id);
    },
    closeEditListing: () => {
      setEditingId(null);
    },
    editingId: getEditingId(),
  };
};

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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
          <P className="text-sm text-muted-foreground">
            Make changes to your listing here.
          </P>
        </DialogHeader>

        <div className="h-[calc(100%-4rem)]">
          {editingId && (
            <ErrorBoundary
              fallback={<ErrorFallback resetErrorBoundary={closeEditListing} />}
              onError={(error) => reportError({ error })}
            >
              <Suspense fallback={<ListingFormSkeleton />}>
                <ListingForm
                  formRef={formRef}
                  listingId={editingId}
                  onDelete={closeEditListing}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
