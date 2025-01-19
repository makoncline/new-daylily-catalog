"use client";

import { useState } from "react";
import { type ListingRouterOutputs } from "@/server/api/routers/listing";
import {
  listingFormSchema,
  transformNullToUndefined,
  type ListingFormData,
} from "@/types/schemas/listing";
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
import { ImageManager } from "@/components/image-manager";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/hooks/use-toast";
import { AhsListingLink } from "@/components/ahs-listing-link";
import { api } from "@/trpc/react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { useZodForm } from "@/hooks/use-zod-form";
import { MultiListSelect } from "@/components/multi-list-select";
import { LISTING_CONFIG } from "@/config/constants";

interface ListingFormProps {
  listingId: string;
  onDelete: () => void;
}

export function ListingForm({ listingId, onDelete }: ListingFormProps) {
  const { toast } = useToast();
  const [listing] = api.listing.get.useSuspenseQuery({ id: listingId });
  const [images, setImages] = useState(listing.images);
  const [lists, setLists] = useState(listing.lists);
  const [isPending, setIsPending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const updateListingMutation = api.listing.update.useMutation({
    onSuccess: (updatedListing) => {
      toast({
        title: "Changes saved",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save changes",
        variant: "destructive",
      });
    },
    meta: {
      path: "/listings",
    },
  });

  const updateListsMutation = api.listing.updateLists.useMutation({
    onSuccess: (updatedListing) => {
      setLists(updatedListing.lists);
      toast({
        title: "Lists updated",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update lists",
        variant: "destructive",
      });
    },
  });

  const deleteListingMutation = api.listing.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Listing deleted successfully",
      });
      onDelete();
    },
    onError: () => {
      toast({
        title: "Failed to delete listing",
        variant: "destructive",
      });
    },
  });

  const form = useZodForm({
    schema: listingFormSchema,
    defaultValues: transformNullToUndefined(listingFormSchema.parse(listing)),
  });

  // Handle auto-save on blur
  const onFieldBlur = async (field: keyof ListingFormData) => {
    const value = form.getValues(field);
    const initialValue =
      field === "price"
        ? (listing[field] ?? undefined)
        : (listing[field] ?? "");

    // Only save if the value has changed
    if (value !== initialValue) {
      setIsPending(true);
      try {
        const updatedListing = await updateListingMutation.mutateAsync({
          id: listing.id,
          data: {
            [field]: value,
          },
        });
      } finally {
        setIsPending(false);
      }
    }
  };

  async function handleDelete() {
    setIsPending(true);
    try {
      await deleteListingMutation.mutateAsync({
        id: listing.id,
      });
    } finally {
      setIsPending(false);
    }
  }

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
                <Input {...field} onBlur={() => onFieldBlur("name")} />
              </FormControl>
              <FormDescription>
                Required. This is the name of your listing.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel htmlFor="image-upload-input">Images</FormLabel>
          <FormDescription>
            Upload images of your listing. You can reorder them by dragging.
          </FormDescription>
          <div className="space-y-4">
            <ImageManager
              type="listing"
              images={images}
              onImagesChange={setImages}
              referenceId={listingId}
            />
            {images.length < LISTING_CONFIG.IMAGES.MAX_COUNT && (
              <div className="p-4">
                <ImageUpload
                  type="listing"
                  referenceId={listingId}
                  onUploadComplete={(result) => {
                    if (result.success && result.image) {
                      setImages((prev) => [...prev, result.image]);
                      toast({
                        title: "Image added successfully",
                      });
                    }
                  }}
                />
              </div>
            )}
          </div>
        </FormItem>
        <FormField
          control={form.control}
          name="publicNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  onBlur={() => onFieldBlur("publicNote")}
                />
              </FormControl>
              <FormDescription>
                Optional. This description will be visible to everyone.
              </FormDescription>
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
                  onBlur={() => onFieldBlur("price")}
                />
              </FormControl>
              <FormDescription>Optional. Price in dollars.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="privateNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Private Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  onBlur={() => onFieldBlur("privateNote")}
                />
              </FormControl>
              <FormDescription>
                Optional. This note will only be visible to you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel htmlFor="list-select">Lists</FormLabel>
          <MultiListSelect
            values={lists.map((list) => list.id)}
            onSelect={(listIds) => {
              setIsPending(true);
              void updateListsMutation
                .mutateAsync({
                  id: listing.id,
                  listIds,
                })
                .catch(() => {
                  toast({
                    title: "Failed to update lists",
                    variant: "destructive",
                  });
                })
                .finally(() => {
                  setIsPending(false);
                });
            }}
            disabled={isPending}
          />
          <FormDescription>
            Optional. Add this listing to one or more lists.
          </FormDescription>
        </FormItem>

        <FormItem>
          <FormLabel htmlFor="ahs-listing-select">
            Link to Daylily Database Listing
          </FormLabel>
          <AhsListingLink
            listing={listing}
            onNameChange={(name) => {
              form.setValue("name", name);
            }}
          />
          <FormDescription>
            Optional. Link your listing to a daylily databse listing to
            automatically populate details like hybridizer, year, and photo from
            our database.
          </FormDescription>
        </FormItem>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isPending}
          >
            Delete Listing
          </Button>
        </div>
      </form>

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Listing"
        description="Are you sure you want to delete this listing? This action cannot be undone."
      />
    </Form>
  );
}
