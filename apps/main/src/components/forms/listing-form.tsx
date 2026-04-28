"use client";

import React, { useCallback, useState } from "react";
import { type Image } from "@prisma/client";
import { toast } from "sonner";

import {
  listingFormSchema,
  transformNullToUndefined,
  type ListingFormData,
} from "@/types/schemas/listing";
import { useManagedFormSave } from "@/hooks/use-managed-form-save";
import { useParentCommitFlag } from "@/hooks/use-parent-commit-flag";
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
import {
  ListingCultivarLinkSection,
  ListingListsSection,
  ListingMediaSection,
} from "@/components/forms/listing-form-sections";
import { useConfirmableAsyncAction } from "@/hooks/use-confirmable-async-action";

import { STATUS } from "@/config/constants";
import {
  type ListingCollectionItem,
  deleteListing,
  updateListing,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { type CultivarReferenceCollectionItem } from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import {
  addListingToList,
  removeListingFromList,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { useListingEditorResource } from "@/hooks/use-listing-editor-resource";

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

function toFormValues(listing: ListingCollectionItem): ListingFormData {
  const normalizedStatus =
    listing.status === STATUS.HIDDEN ? STATUS.HIDDEN : null;

  return transformNullToUndefined(
    listingFormSchema.parse({
      ...listing,
      status: normalizedStatus,
    }),
  )!;
}

function areListingValuesEqual(a: ListingFormData, b: ListingFormData): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.price === b.price &&
    a.status === b.status &&
    a.privateNote === b.privateNote
  );
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
  const { textAreaRef, adjustHeight } = useAutoResizeTextArea();
  const {
    markNeedsParentCommit,
    needsParentCommitRef,
    resetNeedsParentCommit,
  } = useParentCommitFlag();

  const form = useZodForm({
    schema: listingFormSchema,
    defaultValues: toFormValues(listing),
  });
  const {
    isDialogOpen: isDeleteDialogOpen,
    isPending: isDeletePending,
    openDialog: openDeleteDialog,
    runAction: confirmDelete,
    setIsDialogOpen: setIsDeleteDialogOpen,
  } = useConfirmableAsyncAction({
    action: async () => {
      await deleteListing({ id: listing.id });
    },
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      onDelete();
    },
    onError: (error) => {
      toast.error("Failed to delete listing", {
        description: getErrorMessage(error),
      });
      reportError({
        error: normalizeError(error),
        context: { source: "ListingForm" },
      });
    },
  });
  const isBusy = isPending || isDeletePending;

  const hasPendingChanges = useCallback(() => {
    const values = form.getValues();
    const committedValues = toFormValues(listing);
    return (
      !areListingValuesEqual(values, committedValues) ||
      needsParentCommitRef.current
    );
  }, [form, listing, needsParentCommitRef]);

  const { saveChanges } = useManagedFormSave<
    ListingFormSaveReason,
    ListingFormHandle
  >({
    formRef,
    hasPendingChanges,
    save: useCallback(
      async (reason: ListingFormSaveReason): Promise<boolean> => {
        const values = form.getValues();
        const committedValues = toFormValues(listing);
        const hasFieldPending = !areListingValuesEqual(values, committedValues);
        const shouldCommitParent =
          hasFieldPending || needsParentCommitRef.current;

        if (!shouldCommitParent) {
          return true;
        }

        if (reason !== "navigate" && hasFieldPending) {
          const isValid = await form.trigger();
          if (!isValid) {
            return false;
          }
        } else if (reason === "navigate" && hasFieldPending) {
          const parsed = listingFormSchema.safeParse(values);
          if (!parsed.success) {
            return false;
          }
        }

        const shouldUpdateUi = reason !== "navigate";
        if (shouldUpdateUi) {
          setIsPending(true);
        }

        try {
          await updateListing({
            id: listing.id,
            data: values,
          });

          resetNeedsParentCommit();
          if (shouldUpdateUi) {
            form.reset(values, { keepIsValid: true });
          }
          toast.success("Changes saved");
          return true;
        } catch (error) {
          if (shouldUpdateUi) {
            toast.error("Failed to save changes", {
              description: getErrorMessage(error),
            });
            reportError({
              error: normalizeError(error),
              context: { source: "ListingForm", reason },
            });
          }
          return false;
        } finally {
          if (shouldUpdateUi) {
            setIsPending(false);
          }
        }
      },
      [form, listing, needsParentCommitRef, resetNeedsParentCommit],
    ),
  });

  async function onSubmit() {
    await saveChanges("manual");
  }

  const handleUpdateLists = async (nextListIds: string[]) => {
    setIsPending(true);
    const prev = new Set(selectedListIds);
    const next = new Set(nextListIds);

    const toAdd = nextListIds.filter((id) => !prev.has(id));
    const toRemove = selectedListIds.filter((id) => !next.has(id));

    try {
      await Promise.all([
        ...toAdd.map((listId) => addListingToList({ listId, listingId })),
        ...toRemove.map((listId) =>
          removeListingFromList({ listId, listingId }),
        ),
      ]);
      markNeedsParentCommit();
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
                  value={field.value ?? ""}
                  disabled={isBusy}
                />
              </FormControl>
              <FormDescription>
                Required. This is the name of your listing.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <ListingMediaSection
          images={images}
          listingId={listingId}
          onMutationSuccess={markNeedsParentCommit}
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
                  ref={textAreaRef}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    field.onChange(e);
                    adjustHeight();
                  }}
                  className="min-h-[100px]"
                  disabled={isBusy}
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
                  disabled={isBusy}
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
                disabled={isBusy}
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
                  disabled={isBusy}
                />
              </FormControl>
              <FormDescription>
                Optional. This note will only be visible to you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <ListingListsSection
          disabled={isBusy}
          selectedListIds={selectedListIds}
          onSelect={(listIds) => void handleUpdateLists(listIds)}
        />

        <ListingCultivarLinkSection
          listing={listing}
          linkedAhs={linkedAhs}
          onNameChange={(name) => {
            form.setValue("title", name);
          }}
          onMutationSuccess={markNeedsParentCommit}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isBusy || !hasPendingChanges()}
          >
            Save Changes
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={openDeleteDialog}
            disabled={isBusy}
          >
            Delete Listing
          </Button>
        </div>
      </form>

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => void confirmDelete()}
        title="Delete Listing"
        description="Are you sure you want to delete this listing? This action cannot be undone."
      />
    </Form>
  );
}

function ListingFormLive({ listingId, onDelete, formRef }: ListingFormProps) {
  const { images, isReady, linkedAhs, listing, selectedListIds } =
    useListingEditorResource(listingId);

  if (!isReady || !listing) {
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
