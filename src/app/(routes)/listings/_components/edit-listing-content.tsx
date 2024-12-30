"use client";

import { api } from "@/trpc/react";
import { notFound } from "next/navigation";
import { listingSchema, type ListingFormData } from "@/types/schemas/listing";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useState } from "react";
import { useZodForm } from "@/lib/hooks/use-zod-form";

interface EditListingFormProps {
  listing: {
    id: string;
    name: string;
    price: number | null;
    publicNote: string | null;
    privateNote: string | null;
    ahsId: string | null;
    listId: string | null;
  };
}

function EditListingForm({ listing }: EditListingFormProps) {
  const router = useRouter();
  const [isDeletingConfirmed, setIsDeletingConfirmed] = useState(false);

  const updateMutation = api.listing.update.useMutation({
    onSuccess: () => {
      toast.success("Listing updated successfully");
      router.push("/listings");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = api.listing.delete.useMutation({
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      router.push("/listings");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useZodForm({
    schema: listingSchema,
    defaultValues: {
      name: listing.name,
      price: listing.price ?? undefined,
      publicNote: listing.publicNote ?? undefined,
      privateNote: listing.privateNote ?? undefined,
      ahsId: listing.ahsId ?? undefined,
      listId: listing.listId ?? undefined,
    },
  });

  async function onSubmit(values: ListingFormData) {
    updateMutation.mutate({
      id: listing.id,
      data: values,
    });
  }

  async function onDelete() {
    if (!window.confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    setIsDeletingConfirmed(true);
    try {
      await deleteMutation.mutateAsync({ id: listing.id });
    } finally {
      setIsDeletingConfirmed(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">
        Editing listing: {listing.name}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : Number(value));
                    }}
                  />
                </FormControl>
                <FormDescription>Optional. Price in dollars.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="publicNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Public Note</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  This note will be visible to everyone.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="privateNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Private Note</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>
                  This note will only be visible to you.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || isDeletingConfirmed}
              onClick={onDelete}
            >
              {deleteMutation.isPending || isDeletingConfirmed
                ? "Deleting..."
                : "Delete Listing"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface EditListingContentProps {
  id: string;
}

export function EditListingContent({ id }: EditListingContentProps) {
  const {
    data: listing,
    isLoading,
    error,
  } = api.listing.get.useQuery(
    { id },
    {
      retry: false,
    },
  );

  if (error) {
    console.error("Error fetching listing:", error);
    notFound();
  }

  if (isLoading || !listing) {
    return <div>Loading...</div>;
  }

  return <EditListingForm listing={listing} />;
}
