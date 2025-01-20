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
import { transformNullToUndefined } from "@/types/schemas/listing";
import { type z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ListFormProps {
  listId: string;
}

type FormValues = z.infer<typeof listFormSchema>;

export function ListForm({ listId }: ListFormProps) {
  const [list] = api.list.get.useSuspenseQuery({ id: listId });
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const form = useZodForm({
    schema: listFormSchema,
    defaultValues: transformNullToUndefined(listFormSchema.parse(list)),
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

  // Handle auto-save on blur
  const onFieldBlur = async (field: keyof FormValues) => {
    const value = form.getValues(field);
    const initialValue = field === "intro" ? (list[field] ?? "") : list[field];

    // Only save if the value has changed
    if (value !== initialValue) {
      setIsPending(true);
      try {
        if (field === "name") {
          if (!value) {
            // Don't update if name is empty
            return;
          }
          // For name field, we know value is a non-empty string at this point
          await updateList.mutateAsync({
            id: listId,
            data: {
              name: value,
              intro: list.intro ?? undefined,
            },
          });
        } else {
          // For intro field
          await updateList.mutateAsync({
            id: listId,
            data: {
              name: list.name,
              intro: value ?? undefined,
            },
          });
        }
      } finally {
        setIsPending(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onBlur={() => onFieldBlur("name")}
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
          name="intro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  onBlur={() => onFieldBlur("intro")}
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
      </form>
    </Form>
  );
}
