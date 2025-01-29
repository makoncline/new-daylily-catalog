"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListingForm } from "@/components/forms/listing-form";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { ErrorFallback } from "@/components/error-fallback";
import { logError } from "@/lib/error-utils";
import { P } from "@/components/typography";

export const useEditListing = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  const setEditingId = (id: string | null) => {
    if (id) {
      params.set("editing", id);
    } else {
      params.delete("editing");
    }
    router.push(`?${params.toString()}`);
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
          <P className="text-sm text-muted-foreground">
            Make changes to your listing here.
          </P>
        </DialogHeader>

        {editingId && (
          <ErrorBoundary
            fallback={<ErrorFallback resetErrorBoundary={closeEditListing} />}
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
