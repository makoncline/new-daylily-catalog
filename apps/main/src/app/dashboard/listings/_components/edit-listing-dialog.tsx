"use client";

import {
  ListingForm,
  type ListingFormHandle,
} from "@/components/forms/listing-form";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { ArrowLeft } from "lucide-react";
import { Suspense, useLayoutEffect, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQueryParamDialogState } from "@/hooks/use-dialog-search-param";
import { useSaveBeforeNavigate } from "@/hooks/use-save-before-navigate";
import { Button } from "@/components/ui/button";
import { ErrorFallback } from "@/components/error-fallback";
import { PageHeader } from "@/components/page-header";

/**
 * Custom hook for editing listings with URL-backed state.
 */
export const useEditListing = () => {
  const { setValue, value } = useQueryParamDialogState({
    history: "push",
    paramName: "editing",
    scroll: false,
  });

  return {
    editListing: (id: string) => {
      setValue(id);
    },
    closeEditListing: () => {
      setValue(null);
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
  }, []);

  return (
    <section
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
