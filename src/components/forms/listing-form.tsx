"use client";

import { useRouter } from "next/navigation";
import { listingSchema, type ListingFormData } from "@/types/schemas/listing";
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
import { updateListing, deleteListing } from "@/server/actions/listing";

interface ListingFormProps {
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

export function ListingForm({ listing }: ListingFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

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
    setIsPending(true);
    try {
      await updateListing(listing.id, values);
      toast.success("Listing updated successfully");
      router.push("/listings");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update listing",
      );
    } finally {
      setIsPending(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    setIsPending(true);
    try {
      await deleteListing(listing.id);
      toast.success("Listing deleted successfully");
      router.push("/listings");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete listing",
      );
    } finally {
      setIsPending(false);
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={onDelete}
            >
              {isPending ? "Deleting..." : "Delete Listing"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
