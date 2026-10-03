"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import {
  listingFormSchema,
  transformNullToUndefined,
  type ListingFormData,
} from "@/types/schemas/listing";
import { useManagedFormSave } from "@/hooks/use-managed-form-save";
import { useParentCommitFlag } from "@/hooks/use-parent-commit-flag";
import { useZodForm } from "@/hooks/use-zod-form";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";
import {
  getErrorMessage,
  normalizeError,
  reportError,
} from "@/lib/error-utils";
import { STATUS } from "@/config/constants";
import {
  type ListingCollectionItem,
  deleteListing,
  loadMissingListing,
  listingsCollection,
  updateListing,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import {
  addListingToList,
  removeListingFromList,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { rebaseFormValues } from "@/lib/rebase-form-values";

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

function areListingValuesEqual(
  a: ListingFormData,
  b: ListingFormData,
): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.price === b.price &&
    a.status === b.status &&
    a.privateNote === b.privateNote
  );
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
  const [isSaving, setIsSaving] = useState(false);
  const [hasRemoteChange, setHasRemoteChange] = useState(false);
  const committedListingRef = useRef(listing);
  const {
    markNeedsParentCommit,
    needsParentCommit,
    needsParentCommitRef,
    resetNeedsParentCommit,
  } = useParentCommitFlag();

  const form = useZodForm({
    schema: listingFormSchema,
    defaultValues: toFormValues(listing),
  });
  const { dirtyFields } = form.formState;
  const {
    isDialogOpen: isDeleteDialogOpen,
    isPending: isDeletePending,
    openDialog: openDeleteDialog,
    runAction: confirmDelete,
    setIsDialogOpen: setIsDeleteDialogOpen,
  } = useConfirmableAsyncAction({
    action: async () => {
      flushSync(onDelete);
      await deleteListing({ id: listing.id });
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

  const hasPendingChanges = useCallback(() => {
    const values = form.getValues();
    const committedValues = toFormValues(committedListingRef.current);
    return (
      !areListingValuesEqual(values, committedValues) ||
      needsParentCommitRef.current
    );
  }, [form, needsParentCommitRef]);

  const handleCultivarMutation = useCallback(
    (updated: ListingCollectionItem) => {
      const rebased = rebaseFormValues(
        form.getValues(),
        toFormValues(committedListingRef.current),
        toFormValues(updated),
      );
      if (!rebased) {
        setHasRemoteChange(true);
        markNeedsParentCommit();
        return;
      }
      committedListingRef.current = updated;
      form.reset(rebased, { keepIsValid: true });
      setHasRemoteChange(false);
      markNeedsParentCommit();
    },
    [form, markNeedsParentCommit],
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
        const committedValues = toFormValues(committedListingRef.current);
        const hasFieldPending = !areListingValuesEqual(values, committedValues);
        const shouldCommitParent =
          hasFieldPending || needsParentCommitRef.current;

        if (!shouldCommitParent) {
          return true;
        }
        if (!hasFieldPending) {
          if (
            new Date(listing.updatedAt).getTime() >
            new Date(committedListingRef.current.updatedAt).getTime()
          ) {
            committedListingRef.current = listing;
            form.reset(toFormValues(listing), { keepIsValid: true });
          }
          resetNeedsParentCommit();
          setHasRemoteChange(false);
          if (reason === "manual") {
            toast.success("Changes saved");
            onSave();
          }
          return true;
        }

        if (reason !== "navigate" && hasFieldPending) {
          const isValid = await form.trigger(undefined, { shouldFocus: true });
          if (!isValid) {
            return false;
          }
        } else if (reason === "navigate" && hasFieldPending) {
          const parsed = listingFormSchema.safeParse(values);
          if (!parsed.success) {
            return false;
          }
        }

        const shouldUpdateUi = reason !== "navigate";
        if (shouldUpdateUi) {
          setIsSaving(true);
        }

        try {
          const updated = await updateListing({
            id: listing.id,
            expectedUpdatedAt: new Date(
              committedListingRef.current.updatedAt,
            ).toISOString(),
            data: values,
          });

          committedListingRef.current = updated;
          setHasRemoteChange(false);
          resetNeedsParentCommit();
          if (shouldUpdateUi) {
            form.reset(values, { keepIsValid: true });
          }
          toast.success("Changes saved");
          if (reason === "manual") {
            onSave();
          }
          return true;
        } catch (error) {
          if (getErrorMessage(error).includes("changed. Load the latest")) {
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
      [form, listing, needsParentCommitRef, onSave, resetNeedsParentCommit],
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
    const currentVersion = new Date(committedListingRef.current.updatedAt);
    const incomingVersion = new Date(listing.updatedAt);
    if (incomingVersion <= currentVersion) return;
    const rebased = rebaseFormValues(
      form.getValues(),
      toFormValues(committedListingRef.current),
      toFormValues(listing),
    );
    if (!rebased) {
      setHasRemoteChange(true);
      return;
    }
    committedListingRef.current = listing;
    setHasRemoteChange(false);
    form.reset(rebased, { keepIsValid: true });
  }, [form, isSaving, listing]);

  const discardDraftAndLoadLatest = useCallback(async () => {
    setIsSaving(true);
    try {
      await loadMissingListing(listingId);
      const latest = listingsCollection.get(listingId);
      if (!latest) throw new Error("Listing not found.");
      committedListingRef.current = latest;
      form.reset(toFormValues(latest), { keepIsValid: true });
      resetNeedsParentCommit();
      setHasRemoteChange(false);
    } catch (error) {
      toast.error("Failed to load the latest listing", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }, [form, listingId, resetNeedsParentCommit]);

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
