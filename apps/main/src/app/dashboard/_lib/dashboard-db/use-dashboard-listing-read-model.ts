"use client";

import { useMemo } from "react";
import type { Image } from "@prisma/client";
import type { RouterOutputs } from "@/trpc/react";
import { listingsCollection } from "./listings-collection";
import { listsCollection } from "./lists-collection";
import { imagesCollection } from "./images-collection";
import { cultivarReferencesCollection } from "./cultivar-references-collection";
import { DASHBOARD_DB_QUERY_KEYS } from "./dashboard-db-keys";
import { useSeededDashboardDbQuery } from "./use-seeded-dashboard-db-query";
import type { ListingData } from "@/app/dashboard/listings/_components/columns";

type List = RouterOutputs["dashboardDb"]["list"]["list"][number];
type Listing = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type CultivarReference =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];

export interface DashboardListingReadModel {
  images: Image[];
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

function buildImagesByListingId(images: Image[]) {
  const map = new Map<string, Image[]>();

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
  imagesByListingId: Map<string, Image[]>;
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
    };
  });
}

export function useDashboardListingReadModel(): DashboardListingReadModel {
  const { data: listings = [] } = useSeededDashboardDbQuery<Listing>({
    query: (q) =>
      q
        .from({ listing: listingsCollection })
        .orderBy(({ listing }) => listing.createdAt, "desc"),
    queryKey: DASHBOARD_DB_QUERY_KEYS.listings,
  });
  const { data: lists = [] } = useSeededDashboardDbQuery<List>({
    query: (q) =>
      q
        .from({ list: listsCollection })
        .orderBy(({ list }) => list.createdAt, "desc"),
    queryKey: DASHBOARD_DB_QUERY_KEYS.lists,
  });
  const { data: images = [] } = useSeededDashboardDbQuery<Image>({
    query: (q) =>
      q
        .from({ img: imagesCollection })
        .orderBy(({ img }) => img.updatedAt, "asc"),
    queryKey: DASHBOARD_DB_QUERY_KEYS.images,
  });
  const { data: cultivarReferences = [] } =
    useSeededDashboardDbQuery<CultivarReference>({
      query: (q) =>
        q
          .from({ ref: cultivarReferencesCollection })
          .orderBy(({ ref }) => ref.updatedAt, "asc"),
      queryKey: DASHBOARD_DB_QUERY_KEYS.cultivarReferences,
    });

  const listsByListingId = useMemo(() => buildListsByListingId(lists), [lists]);
  const imagesByListingId = useMemo(() => buildImagesByListingId(images), [images]);
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
