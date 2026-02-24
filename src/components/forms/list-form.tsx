"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { useZodForm } from "@/hooks/use-zod-form";
import { listFormSchema } from "@/types/schemas/list";
import {
  deleteList,
  listsCollection,
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

interface ListFormProps {
  listId: string;
  onDelete?: () => void;
  formRef?: React.RefObject<ListFormHandle | null>;
  hasExternalUnsavedChanges?: boolean;
  onExternalChangesSaved?: () => void;
}

export type ListFormSaveReason = "manual" | "close" | "navigate";

export interface ListFormHandle {
  saveChanges: (reason: ListFormSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

function toFormValues(list: ListCollectionItem) {
  return {
    title: list.title,
    description: list.description ?? undefined,
  };
}

function ListFormInner({
  list,
  listId,
  onDelete,
  formRef,
  hasExternalUnsavedChanges = false,
  onExternalChangesSaved,
}: {
  list: ListCollectionItem;
  listId: string;
  onDelete?: () => void;
  formRef?: React.RefObject<ListFormHandle | null>;
  hasExternalUnsavedChanges?: boolean;
  onExternalChangesSaved?: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useZodForm({
    schema: listFormSchema,
    defaultValues: toFormValues(list),
  });
  const isFormDirtyRef = useRef(form.formState.isDirty);
  const hasExternalUnsavedChangesRef = useRef(hasExternalUnsavedChanges);
  isFormDirtyRef.current = form.formState.isDirty;
  hasExternalUnsavedChangesRef.current = hasExternalUnsavedChanges;

  const hasPendingChanges = useCallback(() => {
    return isFormDirtyRef.current || hasExternalUnsavedChangesRef.current;
  }, []);

  const saveChanges = useCallback(
    async (reason: ListFormSaveReason): Promise<boolean> => {
      if (!hasPendingChanges()) {
        return true;
      }

      const values = form.getValues();

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

        if (shouldUpdateUi) {
          form.reset(values, { keepIsValid: true });
          onExternalChangesSaved?.();
          toast.success("List updated", {
            description: "Your list has been updated successfully",
          });
        }
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
    [form, hasPendingChanges, listId, onExternalChangesSaved],
  );

  useEffect(() => {
    if (!formRef) {
      return;
    }

    formRef.current = { saveChanges, hasPendingChanges };
  }, [formRef, hasPendingChanges, saveChanges]);

  async function onSubmit() {
    await saveChanges("manual");
  }

  async function handleDelete() {
    setIsPending(true);
    try {
      await deleteList({ id: listId });
      toast.success("List deleted", {
        description: "Your list has been deleted successfully",
      });
      onDelete?.();
    } catch {
      toast.error("Failed to delete list", {
        description: "An error occurred while deleting your list",
      });
    } finally {
      setIsPending(false);
    }
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
                <Input {...field} disabled={isPending} />
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
                  placeholder="Add a description for your list..."
                  disabled={isPending}
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
            disabled={isPending || !hasPendingChanges()}
          >
            Save Changes
          </Button>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isPending}
            >
              Delete List
            </Button>
          )}
        </div>
      </form>

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete List"
        description="Are you sure you want to delete this list? This action cannot be undone."
      />
    </Form>
  );
}

function ListFormLive({
  listId,
  onDelete,
  formRef,
  hasExternalUnsavedChanges,
  onExternalChangesSaved,
}: ListFormProps) {
  const { data: lists = [], isReady } = useLiveQuery(
    (q) =>
      q.from({ list: listsCollection }).where(({ list }) => eq(list.id, listId)),
    [listId],
  );

  const list = lists[0] ?? null;

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
      hasExternalUnsavedChanges={hasExternalUnsavedChanges}
      onExternalChangesSaved={onExternalChangesSaved}
    />
  );
}

export function ListForm(props: ListFormProps) {
  return <ListFormLive {...props} />;
}
