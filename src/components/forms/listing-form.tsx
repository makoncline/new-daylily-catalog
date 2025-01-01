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
import {
  updateListing,
  deleteListing,
  deleteImage,
} from "@/server/actions/listing";
import { Check, ChevronsUpDown, Search, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";

import type { ListingGetOutput } from "@/server/api/routers/listing";
import type { AhsListing } from "@prisma/client";
import { AhsListingLink } from "@/components/ahs-listing-link";
import { ImageUpload } from "@/components/image-upload";
import { LISTING_CONFIG } from "@/config/constants";

export function ListingForm({ listing }: { listing: ListingGetOutput }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);

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

  async function handleImageDelete(imageId: string) {
    if (
      !window.confirm(
        "Are you sure you want to delete this image? This cannot be undone.",
      )
    ) {
      return;
    }

    setIsPending(true);
    try {
      await deleteImage(imageId);
      toast({
        title: "Image deleted successfully",
      });
      router.refresh();
    } catch {
      toast({
        title: "Failed to delete image",
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

      <div className="space-y-8">
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
                        field.onChange(
                          value === "" ? undefined : Number(value),
                        );
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

        <div className="border-t pt-8">
          <AhsListingLink
            listing={listing}
            onNameChange={(name) => {
              form.setValue("name", name);
            }}
          />
        </div>

        <div className="border-t pt-8">
          <div className="mb-4">
            <h2 className="font-medium">Images</h2>
            <p className="text-sm text-muted-foreground">
              Add up to {LISTING_CONFIG.IMAGES.MAX_COUNT} images for your
              listing. The first image will be used as the main image.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listing.images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square overflow-hidden rounded-lg border"
              >
                <img
                  src={image.url}
                  alt="Listing image"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-4 flex justify-between">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleImageDelete(image.id)}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => window.open(image.url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {listing.images.length < LISTING_CONFIG.IMAGES.MAX_COUNT && (
              <div className="aspect-square">
                <ImageUpload
                  key={uploadKey}
                  type="listing"
                  listingId={listing.id}
                  maxFiles={1}
                  onUploadComplete={({ success }) => {
                    if (success) {
                      setUploadKey((prev) => prev + 1);
                      router.refresh();
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
