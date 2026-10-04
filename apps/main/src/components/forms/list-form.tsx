"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useManagedFormSave } from "@/hooks/use-managed-form-save";
import { useParentCommitFlag } from "@/hooks/use-parent-commit-flag";
import { useZodForm } from "@/hooks/use-zod-form";
import { listFormSchema, type ListFormData } from "@/types/schemas/list";
import {
  deleteList,
  loadMissingList,
  listsCollection,
  updateList,
  type ListCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { Controller, useWatch } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { ListFormSkeleton } from "@/components/forms/list-form-skeleton";
import { useListResource } from "@/app/dashboard/_lib/dashboard-db/use-list-resource";
import { ListMissingState } from "@/components/list-missing-state";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";
import { getErrorMessage } from "@/lib/error-utils";

interface ListFormProps {
  listId: string;
  openDeleteOnMount?: boolean;
  onDelete?: () => void;
  onSave?: () => void;
  onPendingChangesChange?: (hasPendingChanges: boolean) => void;
  formRef?: React.RefObject<ListFormHandle | null>;
}

type ListFormSaveReason = "manual" | "close" | "navigate";

export interface ListFormHandle {
  saveChanges: (reason: ListFormSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
  markNeedsCommit: () => void;
}

function toFormValues(
  list: Pick<ListCollectionItem, "title" | "description">,
): ListFormData {
  return {
    title: list.title,
    description: list.description ?? undefined,
  };
}

function areListValuesEqual(a: ListFormData, b: ListFormData): boolean {
  return a.title === b.title && a.description === b.description;
}

function ListFormInner({
  list,
  listId,
  openDeleteOnMount,
  onDelete,
  onSave,
  onPendingChangesChange,
  formRef,
}: {
  list: ListCollectionItem;
  listId: string;
  openDeleteOnMount?: boolean;
  onDelete?: () => void;
  onSave?: () => void;
  onPendingChangesChange?: (hasPendingChanges: boolean) => void;
  formRef?: React.RefObject<ListFormHandle | null>;
}) {
  const fieldId = useId();
  const [isSaving, setIsSaving] = useState(false);
  const [hasRemoteChange, setHasRemoteChange] = useState(false);
  const committedValuesRef = useRef<ListFormData>(toFormValues(list));
  const committedUpdatedAtRef = useRef(list.updatedAt);
  const {
    markNeedsParentCommit,
    needsParentCommit,
    needsParentCommitRef,
    resetNeedsParentCommit,
  } = useParentCommitFlag();

  const form = useZodForm({
    schema: listFormSchema,
    defaultValues: toFormValues(list),
  });
  const [title, description] = useWatch({
    control: form.control,
    name: ["title", "description"],
  });
  const hasDraftChanges =
    !areListValuesEqual({ title, description }, committedValuesRef.current) ||
    needsParentCommit;
  const {
    isDialogOpen: isDeleteDialogOpen,
    isPending: isDeletePending,
    openDialog: openDeleteDialog,
    runAction: confirmDelete,
    setIsDialogOpen: setIsDeleteDialogOpen,
  } = useConfirmableAsyncAction({
    action: async () => {
      flushSync(() => onDelete?.());
      await deleteList({ id: listId });
    },
    onSuccess: () => {
      toast.success("List deleted", {
        description: "Your list has been deleted successfully",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete list", {
        description: getErrorMessage(error),
      });
    },
  });
  useEffect(() => {
    if (openDeleteOnMount) openDeleteDialog();
  }, [openDeleteOnMount, openDeleteDialog]);
  const isBusy = isSaving || isDeletePending;

  const hasPendingChanges = useCallback(() => {
    const values = form.getValues();
    const committedValues = committedValuesRef.current;
    return (
      !areListValuesEqual(values, committedValues) ||
      needsParentCommitRef.current
    );
  }, [form, needsParentCommitRef]);

  const { saveChanges } = useManagedFormSave<
    ListFormSaveReason,
    ListFormHandle
  >({
    formRef,
    hasPendingChanges,
    save: async (reason) => {
      const values = form.getValues();
      const committedValues = committedValuesRef.current;
      const hasFieldPending = !areListValuesEqual(values, committedValues);
      const shouldCommitParent =
        hasFieldPending || needsParentCommitRef.current;

      if (!shouldCommitParent) {
        return true;
      }
      if (!hasFieldPending) {
        if (
          new Date(list.updatedAt).getTime() >
          new Date(committedUpdatedAtRef.current).getTime()
        ) {
          committedValuesRef.current = toFormValues(list);
          committedUpdatedAtRef.current = list.updatedAt;
          form.reset(toFormValues(list), { keepIsValid: true });
        }
        resetNeedsParentCommit();
        setHasRemoteChange(false);
        if (reason === "manual") {
          toast.success("List updated");
          onSave?.();
        }
        return true;
      }

      if (reason !== "navigate") {
        const isValid = await form.trigger();
        if (!isValid) {
          return false;
        }
      } else {
        const parsed = listFormSchema.safeParse(values);
        if (!parsed.success) {
          return false;
        }
      }

      const shouldUpdateUi = reason !== "navigate";
      if (shouldUpdateUi) {
        setIsSaving(true);
      }
      try {
        const updated = await updateList({
          id: listId,
          expectedUpdatedAt: new Date(
            committedUpdatedAtRef.current,
          ).toISOString(),
          data: {
            title: values.title,
            description: values.description ?? undefined,
          },
        });
        committedValuesRef.current = toFormValues(updated);
        committedUpdatedAtRef.current = updated.updatedAt;
        setHasRemoteChange(false);
        resetNeedsParentCommit();
        if (shouldUpdateUi) {
          form.reset(values, { keepIsValid: true });
        }
        toast.success("List updated", {
          description: "Your list has been updated successfully",
        });
        if (reason === "manual") {
          onSave?.();
        }
        return true;
      } catch (error) {
        if (getErrorMessage(error).includes("changed. Load the latest")) {
          setHasRemoteChange(true);
        }
        if (shouldUpdateUi) {
          toast.error("Failed to update list", {
            description: getErrorMessage(error),
          });
        }
        return false;
      } finally {
        if (shouldUpdateUi) {
          setIsSaving(false);
        }
      }
    },
    createHandle: (baseHandle) => ({
      ...baseHandle,
      markNeedsCommit: markNeedsParentCommit,
    }),
  });

  useEffect(() => {
    const notifyPendingChanges = () => {
      onPendingChangesChange?.(hasPendingChanges());
    };

    notifyPendingChanges();
    const subscription = form.watch(notifyPendingChanges);
    return () => subscription.unsubscribe();
  }, [form, hasPendingChanges, needsParentCommit, onPendingChangesChange]);

  useEffect(() => {
    // Keep the saved baseline while the collection holds an optimistic write.
    if (isSaving) return;

    if (
      new Date(list.updatedAt).getTime() <=
      new Date(committedUpdatedAtRef.current).getTime()
    ) {
      return;
    }
    const nextCommittedValues = toFormValues(list);
    const previousCommittedValues = committedValuesRef.current;
    const currentValues = form.getValues();
    const hasLocalFieldChanges = !areListValuesEqual(
      currentValues,
      previousCommittedValues,
    );

    if (areListValuesEqual(nextCommittedValues, previousCommittedValues)) {
      // Membership changes advance the list version without changing form fields.
      committedUpdatedAtRef.current = list.updatedAt;
      setHasRemoteChange(false);
      return;
    }

    if (hasLocalFieldChanges || needsParentCommitRef.current) {
      setHasRemoteChange(true);
      return;
    }

    committedValuesRef.current = nextCommittedValues;
    committedUpdatedAtRef.current = list.updatedAt;
    setHasRemoteChange(false);
    if (!areListValuesEqual(currentValues, nextCommittedValues)) {
      form.reset(nextCommittedValues, { keepIsValid: true });
    }
  }, [form, isSaving, list, needsParentCommitRef]);

  async function discardDraftAndLoadLatest() {
    setIsSaving(true);
    try {
      await loadMissingList(listId);
      const latest = listsCollection.get(listId);
      if (!latest) throw new Error("List not found.");
      committedValuesRef.current = toFormValues(latest);
      committedUpdatedAtRef.current = latest.updatedAt;
      form.reset(toFormValues(latest), { keepIsValid: true });
      resetNeedsParentCommit();
      setHasRemoteChange(false);
    } catch (error) {
      toast.error("Failed to load the latest list", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function onSubmit() {
    await saveChanges("manual");
  }

  return (
    <>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        {hasRemoteChange && (
          <div role="status" className="text-sm">
            <p>
              The list changed elsewhere. Your unsaved fields are still here.
            </p>
            <button
              type="button"
              className="mt-2 underline"
              disabled={isBusy}
              onClick={() => void discardDraftAndLoadLatest()}
            >
              Discard this draft and load the latest list
            </button>
          </div>
        )}
        <FieldGroup>
          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} data-disabled={isBusy}>
                <FieldLabel htmlFor={`${fieldId}-title`}>Title</FieldLabel>
                <Input
                  {...field}
                  id={`${fieldId}-title`}
                  value={field.value ?? ""}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={`${fieldId}-title-help${fieldState.invalid ? ` ${fieldId}-title-error` : ""}`}
                  disabled={isBusy}
                />
                <FieldDescription id={`${fieldId}-title-help`}>
                  Required: Add a name for your list.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError
                    id={`${fieldId}-title-error`}
                    errors={[fieldState.error]}
                  />
                )}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} data-disabled={isBusy}>
                <FieldLabel htmlFor={`${fieldId}-description`}>
                  Description
                </FieldLabel>
                <Textarea
                  {...field}
                  id={`${fieldId}-description`}
                  value={field.value ?? ""}
                  placeholder="Add a description for your list..."
                  aria-invalid={fieldState.invalid}
                  aria-describedby={`${fieldId}-description-help${fieldState.invalid ? ` ${fieldId}-description-error` : ""}`}
                  disabled={isBusy}
                />
                <FieldDescription id={`${fieldId}-description-help`}>
                  Optional: Add a description for your list.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError
                    id={`${fieldId}-description-error`}
                    errors={[fieldState.error]}
                  />
                )}
              </Field>
            )}
          />
        </FieldGroup>
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="submit" disabled={isBusy || !hasDraftChanges}>
            {isSaving && <Spinner data-icon="inline-start" />}
            Save Changes
          </Button>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={openDeleteDialog}
              disabled={isBusy}
            >
              Delete List
            </Button>
          )}
        </div>
      </form>

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => void confirmDelete()}
        title="Delete List"
        description={`Delete ${list.title}? This action cannot be undone.`}
      />
    </>
  );
}

function ListFormLive({
  listId,
  openDeleteOnMount,
  onDelete,
  onSave,
  onPendingChangesChange,
  formRef,
}: ListFormProps) {
  const [unavailableId, setUnavailableId] = useState<string | null>(null);
  const [freshReviewId, setFreshReviewId] = useState<string | null>(null);
  const { isReady, list } = useListResource(listId);
  const needsPrimaryFetch =
    isReady && (openDeleteOnMount === true || list === null);

  useEffect(() => {
    if (!needsPrimaryFetch) return;
    let active = true;
    void loadMissingList(listId)
      .then(() => {
        if (active) setFreshReviewId(listId);
      })
      .catch(() => {
        if (active) setUnavailableId(listId);
      });
    return () => {
      active = false;
    };
  }, [needsPrimaryFetch, listId]);

  if (
    !isReady ||
    (openDeleteOnMount &&
      freshReviewId !== listId &&
      unavailableId !== listId) ||
    (!list && unavailableId !== listId)
  ) {
    return <ListFormSkeleton />;
  }
  if (!list || unavailableId === listId) {
    return <ListMissingState />;
  }

  return (
    <ListFormInner
      key={listId}
      list={list}
      listId={listId}
      openDeleteOnMount={openDeleteOnMount}
      onDelete={onDelete}
      onSave={onSave}
      onPendingChangesChange={onPendingChangesChange}
      formRef={formRef}
    />
  );
}

export function ListForm(props: ListFormProps) {
  return <ListFormLive {...props} />;
}
