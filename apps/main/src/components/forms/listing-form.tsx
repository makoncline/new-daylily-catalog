"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { ListingFormSkeleton } from "@/components/forms/listing-form-skeleton";
import {
  ListingCultivarLinkSection,
  ListingListsSection,
  ListingMediaSection,
} from "@/components/forms/listing-form-sections";
import {
  ListingNameField,
  ListingDetailsFields,
} from "@/components/forms/listing-details-fields";
import {
  useListingFormController,
  type ListingFormProps,
} from "@/components/forms/use-listing-form";
import { useListingEditorResource } from "@/hooks/use-listing-editor-resource";
import { loadMissingListing } from "@/app/dashboard/_lib/dashboard-db/listings-collection";

type ListingEditorProps = ListingFormProps & {
  resource: ReturnType<typeof useListingEditorResource> & {
    listing: NonNullable<
      ReturnType<typeof useListingEditorResource>["listing"]
    >;
  };
};

function ListingEditor({ resource, ...props }: ListingEditorProps) {
  const {
    listing,
    images,
    linkedAhs,
    linkedCultivarHref,
    linkedCultivarReferenceImage,
    selectedListIds,
  } = resource;
  const {
    form,
    isBusy,
    isSaving,
    hasPendingChanges,
    onSubmit,
    handleUpdateLists,
    markNeedsParentCommit,
    handleCultivarMutation,
    hasRemoteChange,
    discardDraftAndLoadLatest,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    openDeleteDialog,
    confirmDelete,
  } = useListingFormController({ ...props, listing, selectedListIds });
  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="pb-16">
        <FieldGroup>
          {hasRemoteChange && (
            <div role="status" className="rounded-md border p-3 text-sm">
              <p>
                The listing changed elsewhere. Your unsaved fields are still
                here.
              </p>
              <button
                type="button"
                className="mt-2 underline"
                disabled={isBusy}
                onClick={() => void discardDraftAndLoadLatest()}
              >
                Discard this draft and load the latest listing
              </button>
            </div>
          )}
          <FieldDescription>
            Name, description, price, status, and notes are saved when you
            select Save Changes.
          </FieldDescription>
          <ListingNameField form={form} disabled={isBusy} />
          <ListingMediaSection
            images={images}
            listingId={props.listingId}
            onMutationSuccess={markNeedsParentCommit}
          />
          <ListingDetailsFields form={form} disabled={isBusy} />
          <ListingListsSection
            disabled={isBusy}
            selectedListIds={selectedListIds}
            onSelect={(listIds) => void handleUpdateLists(listIds)}
          />
          <ListingCultivarLinkSection
            listing={listing}
            linkedAhs={linkedAhs}
            linkedCultivarHref={linkedCultivarHref}
            linkedCultivarReferenceImage={linkedCultivarReferenceImage}
            onNameChange={(name) => form.setValue("title", name)}
            onMutationSuccess={handleCultivarMutation}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" disabled={isBusy || !hasPendingChanges()}>
              {isSaving ? (
                <>
                  <Spinner aria-hidden="true" data-icon="inline-start" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
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
        </FieldGroup>
      </form>
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => void confirmDelete()}
        title="Delete Listing"
        description={`Delete ${listing.title}? This action cannot be undone.`}
      />
    </>
  );
}

export function ListingForm(props: ListingFormProps) {
  const [unavailableId, setUnavailableId] = useState<string | null>(null);
  const [freshReviewId, setFreshReviewId] = useState<string | null>(null);
  const resource = useListingEditorResource(props.listingId);
  const needsPrimaryFetch =
    resource.isReady &&
    (props.openDeleteOnMount === true || resource.listing === null);
  useEffect(() => {
    if (!needsPrimaryFetch) return;
    let active = true;
    void loadMissingListing(props.listingId)
      .then(() => {
        if (active) setFreshReviewId(props.listingId);
      })
      .catch(() => {
        if (active) setUnavailableId(props.listingId);
      });
    return () => {
      active = false;
    };
  }, [needsPrimaryFetch, props.listingId]);

  if (
    !resource.isReady ||
    (props.openDeleteOnMount &&
      freshReviewId !== props.listingId &&
      unavailableId !== props.listingId) ||
    (!resource.listing && unavailableId !== props.listingId)
  )
    return <ListingFormSkeleton />;
  if (!resource.listing || unavailableId === props.listingId) {
    return (
      <p role="status">
        This listing is unavailable. Return to Listings and try again.
      </p>
    );
  }
  return (
    <ListingEditor
      {...props}
      resource={{ ...resource, listing: resource.listing }}
    />
  );
}
