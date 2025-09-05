"use client";

import { api } from "@/trpc/react";
import { useZodForm } from "@/hooks/use-zod-form";
import { listFormSchema } from "@/types/schemas/list";
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
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

interface ListFormProps {
  listId: string;
  onDelete?: () => void;
  formRef?: React.RefObject<{ saveChanges: () => Promise<void> } | null>;
}

type FormValues = z.infer<typeof listFormSchema>;

export function ListForm({ listId, onDelete, formRef }: ListFormProps) {
  const { toast } = useToast();
  const [list] = api.list.get.useSuspenseQuery({ id: listId });
  const [isPending, setIsPending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useZodForm({
    schema: listFormSchema,
    defaultValues: {
      title: list.title,
      description: list.description ?? undefined,
    },
  });

  const updateList = api.list.update.useMutation({
    onSuccess: () => {
      toast({
        title: "List updated",
        description: "Your list has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update list",
        description: "An error occurred while updating your list",
      });
    },
  });

  const deleteList = api.list.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "List deleted",
        description: "Your list has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete list",
        description: "An error occurred while deleting your list",
      });
    },
  });

  // Handle auto-save on blur
  const onFieldBlur = async (field: keyof FormValues) => {
    if (!form.formState.dirtyFields[field]) return;

    setIsPending(true);
    try {
      const values = form.getValues();
      await updateList.mutateAsync({
        id: listId,
        data: {
          title: field === "title" ? values.title : list.title,
          description:
            field === "description"
              ? values.description
              : (list.description ?? undefined),
        },
      });
      form.reset({}, { keepValues: true, keepIsValid: true });
    } finally {
      setIsPending(false);
    }
  };

  const saveChanges = useCallback(async () => {
    if (!form.formState.isDirty) return;

    setIsPending(true);
    try {
      const values = form.getValues();
      await updateList.mutateAsync({
        id: listId,
        data: {
          title: values.title,
          description: values.description ?? undefined,
        },
      });
      form.reset({}, { keepValues: true, keepIsValid: true });
    } finally {
      setIsPending(false);
    }
  }, [form, listId, updateList]);

  async function onSubmit() {
    await saveChanges();
  }

  async function handleDelete() {
    setIsPending(true);
    try {
      await deleteList.mutateAsync({
        id: listId,
      });
      onDelete?.();
    } finally {
      setIsPending(false);
    }
  }

  // Expose saveChanges to parent via ref
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
