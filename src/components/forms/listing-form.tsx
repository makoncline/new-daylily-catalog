"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { type Image } from "@prisma/client";
import { toast } from "sonner";

import {
  listingFormSchema,
  transformNullToUndefined,
} from "@/types/schemas/listing";
import { useZodForm } from "@/hooks/use-zod-form";
import { useAutoResizeTextArea } from "@/hooks/use-auto-resize-textarea";
import { getErrorMessage, normalizeError, reportError } from "@/lib/error-utils";

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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/currency-input";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import { ImageManager } from "@/components/image-manager";
import { ImageUpload } from "@/components/image-upload";
import { MultiListSelect } from "@/components/multi-list-select";
import { AhsListingLink } from "@/components/ahs-listing-link";

import { LISTING_CONFIG, STATUS } from "@/config/constants";
import {
  type ListingCollectionItem,
  deleteListing,
  listingsCollection,
  updateListing,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import {
  cultivarReferencesCollection,
  type CultivarReferenceCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import {
  addListingToList,
  listsCollection,
  removeListingFromList,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";

type LinkedAhsListing = CultivarReferenceCollectionItem["ahsListing"];

interface ListingFormProps {
  listingId: string;
  onDelete: () => void;
  formRef?: React.RefObject<ListingFormHandle | null>;
}

export type ListingFormSaveReason = "manual" | "close" | "navigate";

export interface ListingFormHandle {
  saveChanges: (reason: ListingFormSaveReason) => Promise<boolean>;
  hasPendingChanges: () => boolean;
}

function ListingFormInner({
  listingId,
  listing,
  linkedAhs,
  images,
  selectedListIds,
  onDelete,
  formRef,
}: {
  listingId: string;
  listing: ListingCollectionItem;
  linkedAhs: LinkedAhsListing | null;
  images: Image[];
  selectedListIds: string[];
  onDelete: () => void;
  formRef?: React.RefObject<ListingFormHandle | null>;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hasExternalUnsavedChanges, setHasExternalUnsavedChanges] =
    useState(false);
  const { textAreaRef, adjustHeight } = useAutoResizeTextArea();

  const normalizedStatus =
    listing.status === STATUS.HIDDEN ? STATUS.HIDDEN : null;

  const form = useZodForm({
    schema: listingFormSchema,
    defaultValues: transformNullToUndefined(
      listingFormSchema.parse({
        ...listing,
        status: normalizedStatus,
      }),
    ),
  });

  const markExternalUnsavedChanges = useCallback(() => {
    setHasExternalUnsavedChanges(true);
  }, []);

  const hasPendingChanges = useCallback(() => {
    return form.formState.isDirty || hasExternalUnsavedChanges;
  }, [form.formState.isDirty, hasExternalUnsavedChanges]);

  const saveChanges = useCallback(
    async (reason: ListingFormSaveReason): Promise<boolean> => {
      if (!hasPendingChanges()) {
        return true;
      }

      const isValid = await form.trigger();
      if (!isValid) {
        return false;
      }

      setIsPending(true);
      try {
        const values = form.getValues();
        await updateListing({
          id: listing.id,
          data: values,
        });

        form.reset(values, { keepIsValid: true });
        setHasExternalUnsavedChanges(false);
        toast.success("Changes saved");
        return true;
      } catch (error) {
        toast.error("Failed to save changes", {
          description: getErrorMessage(error),
        });
        reportError({
          error: normalizeError(error),
          context: { source: "ListingForm", reason },
        });
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [form, hasPendingChanges, listing.id],
  );

  useEffect(() => {
    if (!formRef) {
      return;
    }

    formRef.current = { saveChanges, hasPendingChanges };
  }, [formRef, hasPendingChanges, saveChanges]);

  async function onSubmit() {
    await saveChanges("manual");
  }

  const handleUpdateLists = async (nextListIds: string[]) => {
    setIsPending(true);
    try {
      const prev = new Set(selectedListIds);
      const next = new Set(nextListIds);

      const toAdd = nextListIds.filter((id) => !prev.has(id));
      const toRemove = selectedListIds.filter((id) => !next.has(id));

      await Promise.all([
        ...toAdd.map((listId) => addListingToList({ listId, listingId })),
        ...toRemove.map((listId) =>
          removeListingFromList({ listId, listingId }),
        ),
      ]);
      markExternalUnsavedChanges();
      toast.success("Lists updated");
    } catch (error) {
      toast.error("Failed to update lists", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ListingForm" },
      });
    } finally {
      setIsPending(false);
    }
  };

  async function handleDelete() {
    setIsPending(true);
    try {
      await deleteListing({ id: listing.id });
      toast.success("Listing deleted successfully");
      onDelete();
    } catch (error) {
      toast.error("Failed to delete listing", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ListingForm" },
      });
    } finally {
      setIsPending(false);
    }
  }

  const getUIStatusValue = (dbValue: string | null | undefined): string => {
    return dbValue === STATUS.HIDDEN ? STATUS.HIDDEN : "published";
  };

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
                <Input
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                Required. This is the name of your listing.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <Label htmlFor="image-upload-input">Images</Label>
          <p className="text-muted-foreground text-[0.8rem]">
            Upload images of your listing. You can reorder them by dragging.
          </p>
          <div className="space-y-4">
            <ImageManager
              type="listing"
              images={images}
              referenceId={listingId}
              onMutationSuccess={markExternalUnsavedChanges}
            />
            {images.length < LISTING_CONFIG.IMAGES.MAX_COUNT && (
              <div className="p-4">
                <ImageUpload
                  type="listing"
                  referenceId={listingId}
                  onUploadComplete={markExternalUnsavedChanges}
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
                  className="min-h-[100px]"
                  disabled={isPending}
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
                  disabled={isPending}
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
              <Select
                onValueChange={(value) => {
                  const dbValue =
                    value === "published" ? STATUS.PUBLISHED : STATUS.HIDDEN;

                  field.onChange(dbValue);
                }}
                value={getUIStatusValue(field.value)}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value={STATUS.HIDDEN}>Hidden</SelectItem>
                </SelectContent>
              </Select>
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
                  disabled={isPending}
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
          <Label htmlFor="list-select">Lists</Label>
          <MultiListSelect
            values={selectedListIds}
            onSelect={(listIds) => void handleUpdateLists(listIds)}
            disabled={isPending}
          />
          <p className="text-muted-foreground text-[0.8rem]">
            Optional. Add this listing to one or more lists.
          </p>
        </FormItem>

        <FormItem>
          <Label htmlFor="ahs-listing-select">
            Link to Daylily Database Listing
          </Label>
          <AhsListingLink
            listing={listing}
            linkedAhs={linkedAhs}
            onNameChange={(name) => {
              form.setValue("title", name);
            }}
            onMutationSuccess={markExternalUnsavedChanges}
          />
          <p className="text-muted-foreground text-[0.8rem]">
            Optional. Link your listing to a daylily database listing to
            automatically populate details like hybridizer, year, and photo from
            our database.
          </p>
        </FormItem>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isPending || !hasPendingChanges()}
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

function ListingFormLive({ listingId, onDelete, formRef }: ListingFormProps) {
  const { data: listings = [], isReady: isListingReady } = useLiveQuery(
    (q) =>
      q
        .from({ listing: listingsCollection })
        .where(({ listing }) => eq(listing.id, listingId)),
    [listingId],
  );
  const listing = listings[0] ?? null;

  const {
    data: cultivarReferences = [],
    isReady: isCultivarReferencesReady,
  } = useLiveQuery((q) =>
    q
      .from({ ref: cultivarReferencesCollection })
      .orderBy(({ ref }) => ref.updatedAt, "asc"),
  );

  const { data: images = [], isReady: isImagesReady } = useLiveQuery(
    (q) =>
      q
        .from({ img: imagesCollection })
        .where(({ img }) => eq(img.listingId, listingId))
        .orderBy(({ img }) => img.order, "asc"),
    [listingId],
  );

  const { data: lists = [], isReady: isListsReady } = useLiveQuery((q) =>
    q.from({ list: listsCollection }).orderBy(({ list }) => list.title, "asc"),
  );

  const selectedListIds = useMemo(() => {
    if (!lists.length) return [];

    return lists
      .filter((list) => list.listings.some(({ id }) => id === listingId))
      .map((list) => list.id);
  }, [lists, listingId]);

  const linkedAhs = listing?.cultivarReferenceId
    ? cultivarReferences.find((row) => row.id === listing.cultivarReferenceId)
        ?.ahsListing ?? null
    : null;

  if (
    !isListingReady ||
    !isImagesReady ||
    !isListsReady ||
    !isCultivarReferencesReady ||
    !listing
  ) {
    return <ListingFormSkeleton />;
  }

  return (
    <ListingFormInner
      listingId={listingId}
      listing={listing}
      linkedAhs={linkedAhs}
      images={images}
      selectedListIds={selectedListIds}
      onDelete={onDelete}
      formRef={formRef}
    />
  );
}

export function ListingForm(props: ListingFormProps) {
  return <ListingFormLive {...props} />;
}
