"use client";

import { useMemo } from "react";
import type { RouterOutputs } from "@/trpc/react";
import { type ImageCollectionItem } from "@/app/dashboard/_lib/dashboard-db/collections";

import { useLiveSuspenseQuery } from "@tanstack/react-db";
import type { ListingData } from "@/app/dashboard/listings/_components/columns";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";

type List = RouterOutputs["dashboardV2"]["list"]["list"][number];
type Listing = RouterOutputs["dashboardV2"]["listing"]["list"][number];
type CultivarReference =
  RouterOutputs["dashboardV2"]["bootstrap"]["catalog"]["cultivarReferences"][number];

export interface DashboardListingReadModel {
  images: ImageCollectionItem[];
  lists: List[];
  listingRows: ListingData[];
  listingsById: Map<string, ListingData>;
}

function buildListsByListingId(lists: List[]) {
  const map = new Map<string, Array<Pick<List, "id" | "title">>>();

  for (const list of lists) {
    for (const { id: listingId } of list.listings) {
      const rows = map.get(listingId) ?? [];
      rows.push({ id: list.id, title: list.title });
      map.set(listingId, rows);
    }
  }

  return map;
}

function buildImagesByListingId(images: ImageCollectionItem[]) {
  const map = new Map<string, ImageCollectionItem[]>();

  for (const image of images) {
    if (!image.listingId) continue;
    const rows = map.get(image.listingId) ?? [];
    rows.push(image);
    map.set(image.listingId, rows);
  }

  for (const rows of map.values()) {
    rows.sort((a, b) => a.order - b.order);
  }

  return map;
}

function buildCultivarReferenceById(cultivarReferences: CultivarReference[]) {
  const map = new Map<string, CultivarReference>();
  cultivarReferences.forEach((row) => map.set(row.id, row));
  return map;
}

function buildListingRows({
  cultivarReferenceById,
  imagesByListingId,
  listsByListingId,
  listings,
}: {
  cultivarReferenceById: Map<string, CultivarReference>;
  imagesByListingId: Map<string, ImageCollectionItem[]>;
  listsByListingId: Map<string, Array<Pick<List, "id" | "title">>>;
  listings: Listing[];
}) {
  return listings.map((listing) => {
    const ref = listing.cultivarReferenceId
      ? cultivarReferenceById.get(listing.cultivarReferenceId)
      : null;

    return {
      ...listing,
      images: imagesByListingId.get(listing.id) ?? [],
      lists: listsByListingId.get(listing.id) ?? [],
      ahsListing: ref?.ahsListing ?? null,
      cultivarReferenceImage: ref?.cultivarReferenceImage ?? null,
      cultivarReferenceNormalizedName: ref?.normalizedName ?? null,
    };
  });
}

export function useDashboardListingReadModel(): DashboardListingReadModel {
  const {
    listingsCollection,
    listsCollection,
    imagesCollection,
    cultivarReferencesCollection,
  } = useDashboardDb();
  const listingsQuery = useLiveSuspenseQuery({
    query: (q) =>
      q
        .from({ listing: listingsCollection })
        .orderBy(({ listing }) => listing.createdAt, "desc"),
  });
  const listsQuery = useLiveSuspenseQuery({
    query: (q) =>
      q
        .from({ list: listsCollection })
        .orderBy(({ list }) => list.createdAt, "desc"),
  });
  const imagesQuery = useLiveSuspenseQuery({
    query: (q) =>
      q
        .from({ img: imagesCollection })
        .orderBy(({ img }) => img.updatedAt, "asc"),
  });
  const cultivarReferencesQuery = useLiveSuspenseQuery({
    query: (q) =>
      q
        .from({ ref: cultivarReferencesCollection })
        .orderBy(({ ref }) => ref.updatedAt, "asc"),
  });
  const { data: listings = [] } = listingsQuery;
  const { data: lists = [] } = listsQuery;
  const { data: images = [] } = imagesQuery;
  const { data: cultivarReferences = [] } = cultivarReferencesQuery;

  const listsByListingId = useMemo(() => buildListsByListingId(lists), [lists]);
  const imagesByListingId = useMemo(
    () => buildImagesByListingId(images),
    [images],
  );
  const cultivarReferenceById = useMemo(
    () => buildCultivarReferenceById(cultivarReferences),
    [cultivarReferences],
  );
  const listingRows = useMemo(
    () =>
      buildListingRows({
        cultivarReferenceById,
        imagesByListingId,
        listsByListingId,
        listings,
      }),
    [cultivarReferenceById, imagesByListingId, listsByListingId, listings],
  );
  const listingsById = useMemo(
    () => new Map(listingRows.map((row) => [row.id, row])),
    [listingRows],
  );

  return {
    images,
    lists,
    listingRows,
    listingsById,
  };
}
