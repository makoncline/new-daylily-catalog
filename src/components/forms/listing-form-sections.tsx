"use client";

import { type ComponentProps } from "react";
import { Label } from "@/components/ui/label";
import { ImageManager } from "@/components/image-manager";
import { ImageUpload } from "@/components/image-upload";
import { MultiListSelect } from "@/components/multi-list-select";
import { AhsListingLink } from "@/components/ahs-listing-link";
import { LISTING_CONFIG } from "@/config/constants";
import { type ListingCollectionItem } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { type CultivarReferenceCollectionItem } from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";

type LinkedAhsListing = CultivarReferenceCollectionItem["ahsListing"];

export function ListingMediaSection({
  images,
  listingId,
  onMutationSuccess,
}: {
  images: ComponentProps<typeof ImageManager>["images"];
  listingId: string;
  onMutationSuccess: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="image-upload-input">Images</Label>
      <p className="text-muted-foreground text-[0.8rem]">
        Upload images of your listing. You can reorder them by dragging.
      </p>
      <div className="space-y-4">
        <ImageManager
          type="listing"
          images={images}
          referenceId={listingId}
          onMutationSuccess={onMutationSuccess}
        />
        {images.length < LISTING_CONFIG.IMAGES.MAX_COUNT && (
          <div className="p-4">
            <ImageUpload
              type="listing"
              referenceId={listingId}
              onMutationSuccess={onMutationSuccess}
            />
          </div>
        )}
      </div>
    </div>
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
    <div className="space-y-2">
      <Label htmlFor="list-select">Lists</Label>
      <MultiListSelect
        values={selectedListIds}
        onSelect={onSelect}
        disabled={disabled}
      />
      <p className="text-muted-foreground text-[0.8rem]">
        Optional. Add this listing to one or more lists.
      </p>
    </div>
  );
}

export function ListingCultivarLinkSection({
  linkedAhs,
  listing,
  onMutationSuccess,
  onNameChange,
}: {
  linkedAhs: LinkedAhsListing | null;
  listing: ListingCollectionItem;
  onMutationSuccess: () => void;
  onNameChange: (name: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="ahs-listing-select">Link to Daylily Database Listing</Label>
      <AhsListingLink
        listing={listing}
        linkedAhs={linkedAhs}
        onNameChange={onNameChange}
        onMutationSuccess={onMutationSuccess}
      />
      <p className="text-muted-foreground text-[0.8rem]">
        Optional. Link your listing to a daylily database listing to
        automatically populate details like hybridizer, year, and photo from our
        database.
      </p>
    </div>
  );
}
