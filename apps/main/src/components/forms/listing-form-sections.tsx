"use client";

import { type ComponentProps } from "react";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { ImageManager } from "@/components/image-manager";
import { ImageUpload } from "@/components/image-upload";
import { MultiListSelect } from "@/components/multi-list-select";
import { AhsListingLink } from "@/components/ahs-listing-link";
import { LISTING_CONFIG } from "@/config/constants";
import { useDashboardSectionFocus } from "@/hooks/use-dashboard-section-focus";

export function ListingMediaSection({
  images,
  listingId,
  onMutationSuccess,
}: {
  images: ComponentProps<typeof ImageManager>["images"];
  listingId: string;
  onMutationSuccess: () => void;
}) {
  useDashboardSectionFocus("listing-images");
  return (
    <Field id="listing-images">
      <FieldLabel htmlFor="image-upload-input">Images</FieldLabel>
      <FieldDescription>
        Upload images of your listing. Drag an image to change its order. Image
        changes are saved at once.
      </FieldDescription>
      <ImageManager
        type="listing"
        images={images}
        referenceId={listingId}
        onMutationSuccess={onMutationSuccess}
      />
      {images.length < LISTING_CONFIG.IMAGES.MAX_COUNT && (
        <ImageUpload
          type="listing"
          referenceId={listingId}
          isFirstImageUpload={images.length === 0}
          onMutationSuccess={onMutationSuccess}
        />
      )}
    </Field>
  );
}

export function ListingListsSection({
  disabled,
  onSelect,
  selectedListIds,
}: {
  disabled: boolean;
  onSelect: (listIds: string[]) => void;
  selectedListIds: string[];
}) {
  return (
    <Field data-disabled={disabled}>
      <FieldLabel htmlFor="list-select">Lists</FieldLabel>
      <MultiListSelect
        values={selectedListIds}
        onSelect={onSelect}
        disabled={disabled}
      />
      <FieldDescription>
        Optional. Add this listing to one or more lists. List changes are saved
        at once.
      </FieldDescription>
    </Field>
  );
}

export function ListingCultivarLinkSection({
  linkedAhs,
  linkedCultivarHref,
  linkedCultivarReferenceImage,
  listing,
  onMutationSuccess,
  onNameChange,
}: {
  linkedAhs: ComponentProps<typeof AhsListingLink>["linkedAhs"];
  linkedCultivarHref: string | null;
  linkedCultivarReferenceImage: ComponentProps<
    typeof AhsListingLink
  >["cultivarReferenceImage"];
  listing: ComponentProps<typeof AhsListingLink>["listing"];
  onMutationSuccess: NonNullable<
    ComponentProps<typeof AhsListingLink>["onMutationSuccess"]
  >;
  onNameChange: (name: string) => void;
}) {
  useDashboardSectionFocus("listing-cultivar");
  return (
    <Field id="listing-cultivar">
      <FieldTitle>Link to Daylily Database Listing</FieldTitle>
      <AhsListingLink
        listing={listing}
        linkedAhs={linkedAhs}
        cultivarHref={linkedCultivarHref}
        cultivarReferenceImage={linkedCultivarReferenceImage}
        onNameChange={onNameChange}
        onMutationSuccess={onMutationSuccess}
      />
      <FieldDescription>
        Optional. Link a cultivar to show its database details and photo. Link
        and name sync changes are saved at once.
      </FieldDescription>
    </Field>
  );
}
