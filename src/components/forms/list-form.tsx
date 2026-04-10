"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useManagedFormSave } from "@/hooks/use-managed-form-save";
import { useParentCommitFlag } from "@/hooks/use-parent-commit-flag";
import { useZodForm } from "@/hooks/use-zod-form";
import { listFormSchema, type ListFormData } from "@/types/schemas/list";
import {
  deleteList,
  updateList,
  type ListCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { ListFormSkeleton } from "@/components/forms/list-form-skeleton";
import { useListResource } from "@/app/dashboard/_lib/dashboard-db/use-list-resource";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";

interface ListFormProps {
  listId: string;
  onDelete?: () => void;
  formRef?: React.RefObject<ListFormHandle | null>;
}

export type ListFormSaveReason = "manual" | "close" | "navigate";

export interface ListFormHandle {
  saveChanges: (reason: ListFormSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
  markNeedsCommit: () => void;
}

function toFormValues(list: ListCollectionItem): ListFormData {
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
  onDelete,
  formRef,
}: {
  list: ListCollectionItem;
  listId: string;
  onDelete?: () => void;
  formRef?: React.RefObject<ListFormHandle | null>;
}) {
  const [isPending, setIsPending] = useState(false);
  const committedValuesRef = useRef<ListFormData>(toFormValues(list));
  const {
    markNeedsParentCommit,
    needsParentCommitRef,
    resetNeedsParentCommit,
  } = useParentCommitFlag();

  const form = useZodForm({
    schema: listFormSchema,
    defaultValues: toFormValues(list),
  });
  const {
    isDialogOpen: isDeleteDialogOpen,
    isPending: isDeletePending,
    openDialog: openDeleteDialog,
    runAction: confirmDelete,
    setIsDialogOpen: setIsDeleteDialogOpen,
  } = useConfirmableAsyncAction({
    action: async () => {
      await deleteList({ id: listId });
    },
    onSuccess: () => {
      toast.success("List deleted", {
        description: "Your list has been deleted successfully",
      });
      onDelete?.();
    },
    onError: () => {
      toast.error("Failed to delete list", {
        description: "An error occurred while deleting your list",
      });
    },
  });
  const isBusy = isPending || isDeletePending;

  const hasPendingChanges = useCallback(() => {
    const values = form.getValues();
    const committedValues = toFormValues(list);
    return (
      !areListValuesEqual(values, committedValues) ||
      needsParentCommitRef.current
    );
  }, [form, list, needsParentCommitRef]);

  const { saveChanges } = useManagedFormSave<
    ListFormSaveReason,
    ListFormHandle
  >({
    formRef,
    hasPendingChanges,
    save: async (reason) => {
      const values = form.getValues();
      const committedValues = toFormValues(list);
      const hasFieldPending = !areListValuesEqual(values, committedValues);
      const shouldCommitParent =
        hasFieldPending || needsParentCommitRef.current;

      if (!shouldCommitParent) {
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
        setIsPending(true);
      }
      try {
        await updateList({
          id: listId,
          data: {
            title: values.title,
            description: values.description ?? undefined,
          },
        });
        resetNeedsParentCommit();
        if (shouldUpdateUi) {
          form.reset(values, { keepIsValid: true });
        }
        toast.success("List updated", {
          description: "Your list has been updated successfully",
        });
        return true;
      } catch {
        if (shouldUpdateUi) {
          toast.error("Failed to update list", {
            description: "An error occurred while updating your list",
          });
        }
        return false;
      } finally {
        if (shouldUpdateUi) {
          setIsPending(false);
        }
      }
    },
    createHandle: (baseHandle) => ({
      ...baseHandle,
      markNeedsCommit: markNeedsParentCommit,
    }),
  });

  useEffect(() => {
    const nextCommittedValues = toFormValues(list);
    const previousCommittedValues = committedValuesRef.current;
    const currentValues = form.getValues();
    const hasLocalFieldChanges = !areListValuesEqual(
      currentValues,
      previousCommittedValues,
    );

    committedValuesRef.current = nextCommittedValues;

    if (hasLocalFieldChanges || needsParentCommitRef.current) {
      return;
    }

    if (!areListValuesEqual(currentValues, nextCommittedValues)) {
      form.reset(nextCommittedValues, { keepIsValid: true });
    }
  }, [form, list, needsParentCommitRef]);

  async function onSubmit() {
    await saveChanges("manual");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  disabled={isBusy}
                />
              </FormControl>
              <FormDescription>
                Required: Add a name for your list.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Add a description for your list..."
                  disabled={isBusy}
                />
              </FormControl>
              <FormDescription>
                Optional: Add a description for your list.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isBusy || !hasPendingChanges()}
          >
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
        description="Are you sure you want to delete this list? This action cannot be undone."
      />
    </Form>
  );
}

function ListFormLive({ listId, onDelete, formRef }: ListFormProps) {
  const { isReady, list } = useListResource(listId);

  if (!isReady || !list) {
    return <ListFormSkeleton />;
  }

  return (
    <ListFormInner
      key={listId}
      list={list}
      listId={listId}
      onDelete={onDelete}
      formRef={formRef}
    />
  );
}

export function ListForm(props: ListFormProps) {
  return <ListFormLive {...props} />;
}
