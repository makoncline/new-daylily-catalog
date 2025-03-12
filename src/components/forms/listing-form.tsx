"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useAutoResizeTextArea } from "@/hooks/use-auto-resize-textarea";
import { MultiListSelect } from "@/components/multi-list-select";
import { LISTING_CONFIG, STATUS } from "@/config/constants";
import { CurrencyInput } from "@/components/currency-input";

interface ListingFormProps {
  listingId: string;
  onDelete: () => void;
  formRef?: React.MutableRefObject<
    { saveChanges: () => Promise<void> } | undefined
  >;
}

export function ListingForm({
  listingId,
  onDelete,
  formRef,
}: ListingFormProps) {
  const { toast } = useToast();
  const [listing] = api.listing.get.useSuspenseQuery({ id: listingId });
  const [images, setImages] = useState(listing.images);
  const [lists, setLists] = useState(listing.lists);
  const [isPending, setIsPending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { textAreaRef, adjustHeight } = useAutoResizeTextArea();

  const updateListingMutation = api.listing.update.useMutation({
    onSuccess: () => {
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

  const saveChanges = useCallback(async () => {
    if (!form.formState.isDirty) return;

    setIsPending(true);
    try {
      const values = form.getValues();
      await updateListingMutation.mutateAsync({
        id: listing.id,
        data: values,
      });
      form.reset({}, { keepValues: true, keepIsValid: true });
    } finally {
      setIsPending(false);
    }
  }, [form, listing.id, updateListingMutation]);

  useEffect(() => {
    if (formRef) {
      formRef.current = { saveChanges };
    }
  }, [formRef, saveChanges]);

  async function onSubmit() {
    await saveChanges();
  }

  // Handle auto-save on blur
  const onFieldBlur = async (field: keyof ListingFormData) => {
    if (!form.formState.dirtyFields[field]) return;

    setIsPending(true);
    try {
      const value = form.getValues(field);
      await updateListingMutation.mutateAsync({
        id: listing.id,
        data: {
          [field]: value,
        },
      });
      form.reset({}, { keepValues: true, keepIsValid: true });
    } finally {
      setIsPending(false);
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
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mb-[300px] space-y-6"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} onBlur={() => onFieldBlur("title")} />
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  ref={textAreaRef}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    field.onChange(e);
                    adjustHeight();
                  }}
                  onBlur={() => onFieldBlur("description")}
                  className="min-h-[100px]"
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
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  onValueBlur={(value) => void onFieldBlur("price")}
                />
              </FormControl>
              <FormDescription>
                Optional. Price in whole dollars (no cents).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? null : value);
                  }}
                  onBlur={() => onFieldBlur("status")}
                >
                  {Object.entries(STATUS).map(([key, value]) => (
                    <option key={key} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                Hidden listings will not be visible to the public.
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
              form.setValue("title", name);
            }}
          />
          <FormDescription>
            Optional. Link your listing to a daylily databse listing to
            automatically populate details like hybridizer, year, and photo from
            our database.
          </FormDescription>
        </FormItem>
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isPending}
          >
            Save Changes
          </Button>
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
