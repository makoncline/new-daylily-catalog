"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RouterOutputs } from "@/trpc/react";
import { listingsCollection } from "./listings-collection";
import { listsCollection } from "./lists-collection";
import {
  imagesCollection,
  type ImageCollectionItem,
} from "./images-collection";
import { cultivarReferencesCollection } from "./cultivar-references-collection";
import { DASHBOARD_DB_QUERY_KEYS } from "./dashboard-db-keys";
import { useSeededDashboardDbQuery } from "./use-seeded-dashboard-db-query";
import type { ListingData } from "@/app/dashboard/listings/_components/columns";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";

type List = RouterOutputs["dashboardDb"]["list"]["list"][number];
type Listing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type CultivarReference =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];

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
    };
  });
}

export function useDashboardListingReadModel(): DashboardListingReadModel {
  const firstRowsLoggedRef = useRef(false);
  const listingsQuery = useSeededDashboardDbQuery<Listing>({
    debugLabel: "dashboard.listings",
    query: (q) =>
      q
        .from({ listing: listingsCollection })
        .orderBy(({ listing }) => listing.createdAt, "desc"),
    queryKey: DASHBOARD_DB_QUERY_KEYS.listings,
  });
  const listsQuery = useSeededDashboardDbQuery<List>({
    debugLabel: "dashboard.lists",
    query: (q) =>
      q
        .from({ list: listsCollection })
        .orderBy(({ list }) => list.createdAt, "desc"),
    queryKey: DASHBOARD_DB_QUERY_KEYS.lists,
  });
  const imagesQuery = useSeededDashboardDbQuery<ImageCollectionItem>({
    debugLabel: "dashboard.images",
    query: (q) =>
      q
        .from({ img: imagesCollection })
        .orderBy(({ img }) => img.updatedAt, "asc"),
    queryKey: DASHBOARD_DB_QUERY_KEYS.images,
  });
  const cultivarReferencesQuery = useSeededDashboardDbQuery<CultivarReference>({
    debugLabel: "dashboard.cultivarReferences",
    query: (q) =>
      q
        .from({ ref: cultivarReferencesCollection })
        .orderBy(({ ref }) => ref.updatedAt, "asc"),
    queryKey: DASHBOARD_DB_QUERY_KEYS.cultivarReferences,
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

  useEffect(() => {
    if (firstRowsLoggedRef.current || listingRows.length === 0) return;

    firstRowsLoggedRef.current = true;
    logDashboardTiming("listing-read-model.first-rows", {
      listings: listings.length,
      lists: lists.length,
      images: images.length,
      cultivarReferences: cultivarReferences.length,
      listingRows: listingRows.length,
      listingsReady: listingsQuery.isReady,
      listsReady: listsQuery.isReady,
      imagesReady: imagesQuery.isReady,
      cultivarReferencesReady: cultivarReferencesQuery.isReady,
    });
  }, [
    cultivarReferences.length,
    cultivarReferencesQuery.isReady,
    images.length,
    imagesQuery.isReady,
    listingRows.length,
    listings.length,
    listingsQuery.isReady,
    lists.length,
    listsQuery.isReady,
  ]);

  return {
    images,
    lists,
    listingRows,
    listingsById,
  };
}
