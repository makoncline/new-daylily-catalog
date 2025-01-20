"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ListingForm } from "@/components/forms/listing-form";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { ErrorFallback } from "@/components/error-fallback";
import { logError } from "@/lib/error-utils";

export const useEditListing = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const isOpen = !!editingId;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeEditListing();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-full overflow-y-auto sm:max-w-xl md:max-w-2xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
          <DialogDescription>
            Make changes to your listing here.
          </DialogDescription>
        </DialogHeader>
        {editingId && (
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={closeEditListing}
            onError={logError}
          >
            <Suspense fallback={<ListingFormSkeleton />}>
              <ListingForm listingId={editingId} onDelete={closeEditListing} />
            </Suspense>
          </ErrorBoundary>
        )}
      </DialogContent>
    </Dialog>
  );
}
