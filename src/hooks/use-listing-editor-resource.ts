"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { type Image } from "@prisma/client";
import {
  type ListingCollectionItem,
  listingsCollection,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import {
  cultivarReferencesCollection,
  type CultivarReferenceCollectionItem,
} from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import { listsCollection } from "@/app/dashboard/_lib/dashboard-db/lists-collection";

type LinkedAhsListing = CultivarReferenceCollectionItem["ahsListing"];

export interface ListingEditorResource {
  images: Image[];
  isReady: boolean;
  linkedAhs: LinkedAhsListing | null;
  listing: ListingCollectionItem | null;
  selectedListIds: string[];
}

export function useListingEditorResource(
  listingId: string,
): ListingEditorResource {
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

  const selectedListIds = lists
    .filter((list) => list.listings.some(({ id }) => id === listingId))
    .map((list) => list.id);

  const linkedAhs = listing?.cultivarReferenceId
    ? (cultivarReferences.find((row) => row.id === listing.cultivarReferenceId)
        ?.ahsListing ?? null)
    : null;

  return {
    images,
    isReady:
      isListingReady &&
      isCultivarReferencesReady &&
      isImagesReady &&
      isListsReady &&
      !!listing,
    linkedAhs,
    listing,
    selectedListIds,
  };
}
