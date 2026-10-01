"use client";

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
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    openDeleteDialog,
    confirmDelete,
  } = useListingFormController({ ...props, listing, selectedListIds });
  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="pb-16">
        <FieldGroup>
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
            onNameChange={(name) =>
              form.setValue("title", name, { shouldDirty: true })
            }
            onMutationSuccess={markNeedsParentCommit}
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
        description="Are you sure you want to delete this listing? This action cannot be undone."
      />
    </>
  );
}

export function ListingForm(props: ListingFormProps) {
  const resource = useListingEditorResource(props.listingId);
  if (!resource.isReady || !resource.listing) return <ListingFormSkeleton />;
  return (
    <ListingEditor
      {...props}
      resource={{ ...resource, listing: resource.listing }}
    />
  );
}
