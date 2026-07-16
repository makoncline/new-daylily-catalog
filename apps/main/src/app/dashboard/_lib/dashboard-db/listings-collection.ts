"use client";

import { createCollection, type Collection } from "@tanstack/react-db";
import {
  queryCollectionOptions,
  type QueryCollectionUtils,
} from "@tanstack/query-db-collection";
import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { makeInsertWithSwap } from "@/lib/utils/collection-utils";
import { createTempId } from "@/lib/utils/create-temp-id";
import { omitUndefined } from "@/lib/utils/omit-undefined";
import { ensureCultivarReferencesCached } from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { getUserCursorKey } from "@/lib/utils/cursor";
import { runWithDashboardRefreshLock } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import {
  fetchDashboardSyncPages,
  refreshDashboardDbCollectionFromServer,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";
import {
  dashboardDbCollectionId,
  withDashboardDbPersistence,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persisted-options";
import { capturePosthogEvent } from "@/lib/analytics/posthog";

const CURSOR_BASE = "dashboard-db:listings:maxUpdatedAt";
const QUERY_KEY = ["dashboard-db", "listings"] as const;
const DELETED_IDS = new Set<string>();
let shouldSkipNextListingsSync = false;

export type ListingCollectionItem =
  RouterOutputs["dashboardDb"]["listing"]["list"][number];
type ListingCollection = Collection<
  ListingCollectionItem,
  string,
  QueryCollectionUtils<ListingCollectionItem>
>;

function sortListings(rows: readonly ListingCollectionItem[]) {
  return [...rows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export function suppressNextListingsCollectionSync() {
  shouldSkipNextListingsSync = true;
}

export function clearNextListingsCollectionSyncSuppression() {
  shouldSkipNextListingsSync = false;
}

export async function cleanupListingsCollection() {
  DELETED_IDS.clear();
  shouldSkipNextListingsSync = false;
  await listingsCollection.cleanup();
}

function getExistingListingRows(
  queryKey: readonly unknown[],
): ListingCollectionItem[] {
  const queryRows: ListingCollectionItem[] =
    getQueryClient().getQueryData(queryKey) ?? [];
  const collectionRows: ListingCollectionItem[] = Array.from(
    listingsCollection.values(),
  );

  return queryRows.length >= collectionRows.length ? queryRows : collectionRows;
}

function createListingsCollection(
  persistence: PersistedCollectionPersistence | null,
  userId: string | null,
): ListingCollection {
  const options = queryCollectionOptions<ListingCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: QUERY_KEY,
    enabled: true,
    staleTime: Infinity,
    retry: false,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey }) => {
      const existing = getExistingListingRows(queryKey);

      if (shouldSkipNextListingsSync) {
        shouldSkipNextListingsSync = false;
        return sortListings(existing);
      }

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);

      const upserts = await fetchDashboardSyncPages({
        label: "listing.sync",
        since: last ?? null,
        fetchPage: (input) =>
          getTrpcClient().dashboardDb.listing.sync.query(input),
      });

      const map = new Map(existing.map((i) => [i.id, i]));
      upserts.forEach((i) => map.set(i.id, i));
      DELETED_IDS.forEach((id) => map.delete(id));

      writeCursorFromRows({ cursorStorageKey: cursorKeyToUse, rows: upserts });
      return sortListings(Array.from(map.values()));
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  });

  return createCollection(
    withDashboardDbPersistence<ListingCollectionItem>({
      options,
      persistence,
      collectionId: dashboardDbCollectionId({ name: "listings", userId }),
    }) as Parameters<typeof createCollection>[0],
  ) as unknown as ListingCollection;
}

export let listingsCollection: ListingCollection = createListingsCollection(
  null,
  null,
);

export function resetListingsCollectionWithPersistence(
  persistence: PersistedCollectionPersistence | null,
  userId: string | null,
) {
  DELETED_IDS.clear();
  shouldSkipNextListingsSync = false;
  listingsCollection = createListingsCollection(persistence, userId);
}

type InsertDraft = RouterInputs["dashboardDb"]["listing"]["create"];
export async function insertListing(draft: InsertDraft) {
  return runWithDashboardRefreshLock(async () => {
    const hadPersistedListings = getExistingListingRows(QUERY_KEY).some(
      (listing) => !listing.id.startsWith("temp:"),
    );
    const run = makeInsertWithSwap<InsertDraft, ListingCollectionItem>({
      collection: listingsCollection,
      makeTemp: (d) => ({
        id: createTempId(),
        userId: "",
        title: d.title,
        slug: "",
        price: null,
        description: null,
        privateNote: null,
        status: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        cultivarReferenceId: d.cultivarReferenceId ?? null,
      }),
      serverInsert: (d) => getTrpcClient().dashboardDb.listing.create.mutate(d),
    });

    const created = await run(draft);

    if (!hadPersistedListings) {
      capturePosthogEvent("first_listing_created", {
        listingId: created.id,
        cultivarLinked: Boolean(draft.cultivarReferenceId),
      });
    }

    if (draft.cultivarReferenceId) {
      try {
        await ensureCultivarReferencesCached([draft.cultivarReferenceId]);
      } catch {
        // ignore cache helper failures
      }
    }

    return created;
  });
}

type UpdateDraft = RouterInputs["dashboardDb"]["listing"]["update"];
export async function updateListing(draft: UpdateDraft) {
  await runWithDashboardRefreshLock(async () => {
    const previous = listingsCollection.get(draft.id);

    listingsCollection.utils.writeUpdate({
      id: draft.id,
      ...omitUndefined(draft.data),
    });

    try {
      const updated =
        await getTrpcClient().dashboardDb.listing.update.mutate(draft);
      listingsCollection.utils.writeUpdate(updated);
    } catch (error) {
      if (previous) listingsCollection.utils.writeUpdate(previous);
      throw error;
    }
  });
}

export async function deleteListing({
  id,
  onOptimisticDelete,
}: {
  id: string;
  onOptimisticDelete?: () => void;
}) {
  await runWithDashboardRefreshLock(async () => {
    const previous = listingsCollection.get(id);
    DELETED_IDS.add(id);
    listingsCollection.utils.writeDelete(id);

    try {
      onOptimisticDelete?.();
      await getTrpcClient().dashboardDb.listing.delete.mutate({ id });
    } catch (error) {
      if (previous) listingsCollection.utils.writeInsert(previous);
      DELETED_IDS.delete(id);
      throw error;
    }
  });
}

type LinkAhsDraft = RouterInputs["dashboardDb"]["listing"]["linkAhs"];
export async function linkAhs(draft: LinkAhsDraft) {
  return runWithDashboardRefreshLock(async () => {
    const updated =
      await getTrpcClient().dashboardDb.listing.linkAhs.mutate(draft);

    if (updated.cultivarReferenceId) {
      try {
        await ensureCultivarReferencesCached([updated.cultivarReferenceId]);
      } catch {
        // ignore cache helper failures
      }
    }

    listingsCollection.utils.writeUpdate(updated);
    return updated;
  });
}

type UnlinkAhsDraft = RouterInputs["dashboardDb"]["listing"]["unlinkAhs"];
export async function unlinkAhs(draft: UnlinkAhsDraft) {
  return runWithDashboardRefreshLock(async () => {
    const updated =
      await getTrpcClient().dashboardDb.listing.unlinkAhs.mutate(draft);
    listingsCollection.utils.writeUpdate(updated);
    return updated;
  });
}

type SyncAhsNameDraft = RouterInputs["dashboardDb"]["listing"]["syncAhsName"];
export async function syncAhsName(draft: SyncAhsNameDraft) {
  return runWithDashboardRefreshLock(async () => {
    const updated =
      await getTrpcClient().dashboardDb.listing.syncAhsName.mutate(draft);
    listingsCollection.utils.writeUpdate(updated);
    return updated;
  });
}

export async function refreshListingsCollectionFromServer(userId: string) {
  await refreshDashboardDbCollectionFromServer({
    userId,
    queryKey: QUERY_KEY,
    cursorBase: CURSOR_BASE,
    fetchRows: () =>
      fetchDashboardSyncPages({
        label: "listing.full-refresh",
        since: null,
        fetchPage: (input) =>
          getTrpcClient().dashboardDb.listing.sync.query(input),
      }),
    sortRows: sortListings,
    filterRows: (row) => !DELETED_IDS.has(row.id),
  });
}

export async function initializeListingsCollection(userId: string) {
  await refreshListingsCollectionFromServer(userId);
  suppressNextListingsCollectionSync();
  await listingsCollection.preload();
}
