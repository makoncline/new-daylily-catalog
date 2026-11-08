"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { toast } from "sonner";
import {
  listingFormSchema,
  transformNullToUndefined,
  type ListingFormData,
} from "@/types/schemas/listing";
import { useManagedFormSave } from "@/hooks/use-managed-form-save";
import { useFormCommit } from "@/hooks/use-form-commit";
import { useZodForm } from "@/hooks/use-zod-form";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import { STATUS } from "@/config/constants";
import { type ListingCollectionItem } from "@/app/dashboard/_lib/dashboard-db/collections";

import { isConflictError } from "@/trpc/is-conflict-error";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";

export interface ListingFormProps {
  listingId: string;
  openDeleteOnMount?: boolean;
  onDelete: () => void;
  onSave: () => void;
  onPendingChangesChange?: (hasPendingChanges: boolean) => void;
  formRef?: RefObject<ListingFormHandle | null>;
}

type ListingFormSaveReason = "manual" | "close" | "navigate";

export interface ListingFormHandle {
  saveChanges: (reason: ListingFormSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

function toFormValues(listing: ListingCollectionItem): ListingFormData {
  const normalizedStatus =
    listing.status === STATUS.HIDDEN ? STATUS.HIDDEN : null;

  return transformNullToUndefined(
    listingFormSchema.parse({
      ...listing,
      status: normalizedStatus,
    }),
  )!;
}

export function useListingFormController({
  listingId,
  openDeleteOnMount,
  listing,
  selectedListIds,
  onDelete,
  onSave,
  onPendingChangesChange,
  formRef,
}: {
  listingId: string;
  openDeleteOnMount?: boolean;
  listing: ListingCollectionItem;
  selectedListIds: string[];
  onDelete: () => void;
  onSave: () => void;
  onPendingChangesChange?: (hasPendingChanges: boolean) => void;
  formRef?: RefObject<ListingFormHandle | null>;
}) {
  const {
    deleteListing,
    updateListing,
    loadMissingListing,
    listingsCollection,
    addListingToList,
    removeListingFromList,
  } = useDashboardDb();
  const [isSaving, setIsSaving] = useState(false);
  const form = useZodForm({
    schema: listingFormSchema,
    defaultValues: toFormValues(listing),
  });
  const {
    committed,
    hasRemoteChange,
    setHasRemoteChange,
    hasFieldChanges,
    hasPendingChanges,
    markNeedsParentCommit,
    needsParentCommit,
    reset,
    rebase,
    saveFields,
  } = useFormCommit(form, listing, toFormValues);
  const { dirtyFields } = form.formState;
  const {
    isDialogOpen: isDeleteDialogOpen,
    isPending: isDeletePending,
    openDialog: openDeleteDialog,
    runAction: confirmDelete,
    setIsDialogOpen: setIsDeleteDialogOpen,
  } = useConfirmableAsyncAction({
    action: async () => {
      await deleteListing({ id: listing.id });
      onDelete();
    },
    onSuccess: () => {
      toast.success("Listing deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete listing", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ListingForm" },
      });
    },
  });
  useEffect(() => {
    if (openDeleteOnMount) openDeleteDialog();
  }, [openDeleteOnMount, openDeleteDialog]);
  const isBusy = isSaving || isDeletePending;

  const handleCultivarMutation = useCallback(
    (updated: ListingCollectionItem) => {
      rebase(updated);
      markNeedsParentCommit();
    },
    [rebase, markNeedsParentCommit],
  );

  const { saveChanges } = useManagedFormSave<
    ListingFormSaveReason,
    ListingFormHandle
  >({
    formRef,
    hasPendingChanges,
    save: useCallback(
      async (reason: ListingFormSaveReason): Promise<boolean> => {
        const values = form.getValues();
        const hasFields = hasFieldChanges();
        if (hasFields) {
          const valid =
            reason === "navigate"
              ? listingFormSchema.safeParse(values).success
              : await form.trigger(undefined, { shouldFocus: true });
          if (!valid) return false;
        }

        const shouldUpdateUi = reason !== "navigate";
        if (shouldUpdateUi) {
          setIsSaving(true);
        }

        try {
          const complete = await saveFields(
            listing,
            (data, expectedUpdatedAt) =>
              updateListing({ id: listing.id, expectedUpdatedAt, data }),
          );
          if (!complete) return false;
          if (hasFields || reason === "manual") toast.success("Changes saved");
          if (reason === "manual") {
            onSave();
          }
          return true;
        } catch (error) {
          if (isConflictError(error)) {
            setHasRemoteChange(true);
          }
          if (shouldUpdateUi) {
            toast.error("Failed to save changes", {
              description: getErrorMessage(error),
            });
            reportError({
              error: normalizeError(error),
              context: { source: "ListingForm", reason },
            });
          }
          return false;
        } finally {
          if (shouldUpdateUi) {
            setIsSaving(false);
          }
        }
      },
      [
        updateListing,
        form,
        listing,
        hasFieldChanges,
        onSave,
        setHasRemoteChange,
        saveFields,
      ],
    ),
  });

  useEffect(() => {
    const notifyPendingChanges = () => {
      onPendingChangesChange?.(hasPendingChanges());
    };

    notifyPendingChanges();
    const subscription = form.watch(notifyPendingChanges);
    return () => subscription.unsubscribe();
  }, [
    dirtyFields,
    form,
    hasPendingChanges,
    needsParentCommit,
    onPendingChangesChange,
  ]);

  useEffect(() => {
    if (isSaving) return;
    if (new Date(listing.updatedAt) > new Date(committed.current.updatedAt))
      rebase(listing);
  }, [committed, isSaving, listing, rebase]);

  const discardDraftAndLoadLatest = useCallback(async () => {
    setIsSaving(true);
    try {
      await loadMissingListing(listingId);
      const latest = listingsCollection.get(listingId);
      if (!latest) throw new Error("Listing not found.");
      reset(latest);
    } catch (error) {
      toast.error("Failed to load the latest listing", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [listingsCollection, loadMissingListing, listingId, reset]);

  async function onSubmit() {
    await saveChanges("manual");
  }

  const handleUpdateLists = async (nextListIds: string[]) => {
    setIsSaving(true);
    const prev = new Set(selectedListIds);
    const next = new Set(nextListIds);

    const toAdd = nextListIds.filter((id) => !prev.has(id));
    const toRemove = selectedListIds.filter((id) => !next.has(id));

    try {
      await Promise.all([
        ...toAdd.map((listId) => addListingToList({ listId, listingId })),
        ...toRemove.map((listId) =>
          removeListingFromList({ listId, listingId }),
        ),
      ]);
      markNeedsParentCommit();
      toast.success("Lists updated");
    } catch (error) {
      toast.error("Failed to update lists", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ListingForm" },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    confirmDelete,
    form,
    handleUpdateLists,
    hasPendingChanges,
    isBusy,
    isSaving,
    isDeleteDialogOpen,
    markNeedsParentCommit,
    handleCultivarMutation,
    hasRemoteChange,
    discardDraftAndLoadLatest,
    onSubmit,
    openDeleteDialog,
    setIsDeleteDialogOpen,
  };
}
