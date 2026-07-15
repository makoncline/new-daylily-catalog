"use client";

import {
  ListingForm,
  type ListingFormHandle,
} from "@/components/forms/listing-form";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { ArrowLeft } from "lucide-react";
import {
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQueryParamDialogState } from "@/hooks/use-dialog-search-param";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { Button } from "@/components/ui/button";
import { ErrorFallback } from "@/components/error-fallback";
import { PageHeader } from "@/components/page-header";
import { ListingSurfaceSaveBar } from "./listing-surface-save-bar";

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
 * Keeps edits local until the user explicitly saves or discards them.
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
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasPendingChanges = useCallback(
    () => formRef.current?.hasPendingChanges() ?? false,
    [],
  );
  const { confirmDiscard } = useUnsavedChangesGuard(hasPendingChanges);

  const syncDirtyState = () => {
    requestAnimationFrame(() => {
      setIsDirty(hasPendingChanges());
    });
  };

  const handleBack = () => {
    if (confirmDiscard()) {
      onClose();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await formRef.current?.saveChanges("manual");
    } finally {
      setIsSaving(false);
      syncDirtyState();
    }
  };

  useLayoutEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      aria-label="Edit listing"
      className="mx-auto w-full max-w-3xl pb-8"
      onInputCapture={syncDirtyState}
      onChangeCapture={syncDirtyState}
    >
      {isDirty ? (
        <ListingSurfaceSaveBar
          title="Unsaved listing"
          saveLabel="Save"
          isSaving={isSaving}
          saveDisabled={false}
          onDiscard={onClose}
          onSave={() => void handleSave()}
        />
      ) : null}

      <PageHeader heading="Edit Listing" text="Make changes to your listing.">
        <Button
          ref={backButtonRef}
          type="button"
          variant="outline"
          onClick={handleBack}
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
