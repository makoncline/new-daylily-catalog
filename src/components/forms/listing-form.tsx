"use client";

import { useRouter } from "next/navigation";
import {
  listingFormSchema,
  transformNullToUndefined,
  type ListingFormData,
} from "@/types/schemas/listing";
import { useToast } from "@/hooks/use-toast";
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

import type { ListingGetOutput } from "@/server/api/routers/listing";

export function ListingForm({ listing }: { listing: ListingGetOutput }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useZodForm({
    schema: listingFormSchema,
    defaultValues: {
      ...transformNullToUndefined(listingFormSchema.parse(listing)),
    },
  });

  async function onSubmit(values: ListingFormData) {
    setIsPending(true);
    try {
      await updateListing(listing.id, values);
      toast({
        title: "Listing updated successfully",
      });
      router.push("/listings");
    } catch {
      toast({
        title: "Failed to update listing",
        variant: "destructive",
      });
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
      toast({
        title: "Listing deleted successfully",
      });
      router.push("/listings");
    } catch {
      toast({
        title: "Failed to delete listing",
        variant: "destructive",
      });
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
