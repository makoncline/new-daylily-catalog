"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { listFormSchema } from "@/types/schemas/list";
import { useLiveQuery, eq } from "@tanstack/react-db";
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
import { type z } from "zod";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { ListFormSkeleton } from "@/components/forms/list-form-skeleton";
import { ClientOnly } from "@/components/client-only";

interface ListFormProps {
  listId: string;
  onDelete?: () => void;
  formRef?: React.RefObject<{ saveChanges: () => Promise<void> } | null>;
}

type FormValues = z.infer<typeof listFormSchema>;

function ListFormInner({
  list,
  listId,
  onDelete,
  formRef,
}: {
  list: ListCollectionItem;
  listId: string;
  onDelete?: () => void;
  formRef?: React.RefObject<{ saveChanges: () => Promise<void> } | null>;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useZodForm({
    schema: listFormSchema,
    defaultValues: {
      title: list.title,
      description: list.description ?? undefined,
    },
  });

  const onFieldBlur = async (field: keyof FormValues) => {
    if (!form.formState.dirtyFields[field]) return;

    setIsPending(true);
    try {
      const values = form.getValues();
      await updateList({
        id: listId,
        data: {
          title: values.title,
          description: values.description ?? undefined,
        },
      });
      form.reset({}, { keepValues: true, keepIsValid: true });
      toast.success("List updated", {
        description: "Your list has been updated successfully",
      });
    } catch {
      toast.error("Failed to update list", {
        description: "An error occurred while updating your list",
      });
    } finally {
      setIsPending(false);
    }
  };

  const saveChanges = useCallback(async () => {
    if (!form.formState.isDirty) return;

    setIsPending(true);
    try {
      const values = form.getValues();
      await updateList({
        id: listId,
        data: {
          title: values.title,
          description: values.description ?? undefined,
        },
      });
      form.reset({}, { keepValues: true, keepIsValid: true });
      toast.success("List updated", {
        description: "Your list has been updated successfully",
      });
    } catch {
      toast.error("Failed to update list", {
        description: "An error occurred while updating your list",
      });
    } finally {
      setIsPending(false);
    }
  }, [form, listId]);

  async function onSubmit() {
    await saveChanges();
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

  useEffect(() => {
    if (formRef) {
      formRef.current = { saveChanges };
    }
  }, [formRef, saveChanges]);

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
                  onBlur={() => onFieldBlur("title")}
                  disabled={isPending}
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
                  onBlur={() => onFieldBlur("description")}
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
            disabled={isPending}
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

function ListFormLive({ listId, onDelete, formRef }: ListFormProps) {
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
    />
  );
}

export function ListForm(props: ListFormProps) {
  return (
    <ClientOnly fallback={<ListFormSkeleton />}>
      <ListFormLive {...props} />
    </ClientOnly>
  );
}
