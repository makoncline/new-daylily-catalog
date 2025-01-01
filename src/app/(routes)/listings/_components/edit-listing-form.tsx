"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ListingFormData } from "@/types/schemas/listing";
import {
  updateListing,
  deleteListing,
} from "@/server/actions/listings/edit-listing";
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
import { listingFormSchema } from "@/types/schemas/listing";

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

export function EditListingForm({ listing }: EditListingFormProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingFormSchema),
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
    try {
      await updateListing(listing.id, values);
      toast.success("Listing updated successfully");
      router.push("/listings");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update listing",
      );
    }
  }

  async function onDelete() {
    if (!window.confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteListing(listing.id);
      toast.success("Listing deleted successfully");
      router.push("/listings");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete listing",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
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
                  value={field.value?.toString() ?? ""}
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
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={onDelete}
          >
            {isDeleting ? "Deleting..." : "Delete Listing"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
