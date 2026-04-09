"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { makeInsertWithSwap } from "@/lib/utils/collection-utils";
import { createTempId } from "@/lib/utils/create-temp-id";
import { omitUndefined } from "@/lib/utils/omit-undefined";
import {
  ensureCultivarReferencesCached,
} from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { getUserCursorKey } from "@/lib/utils/cursor";
import {
  runWithDashboardRefreshLock,
  schedulePersistDashboardDbForCurrentUser,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import {
  refreshDashboardDbCollectionFromServer,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";

const CURSOR_BASE = "dashboard-db:listings:maxUpdatedAt";
const QUERY_KEY = ["dashboard-db", "listings"] as const;
const DELETED_IDS = new Set<string>();
let shouldSkipNextListingsSync = false;

export type ListingCollectionItem =
  RouterOutputs["dashboardDb"]["listing"]["list"][number];

function sortListings(rows: readonly ListingCollectionItem[]) {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

export const listingsCollection = createCollection(
  queryCollectionOptions<ListingCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: QUERY_KEY,
    enabled: true,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey }) => {
      const existing: ListingCollectionItem[] =
        getQueryClient().getQueryData(queryKey) ?? [];

      if (shouldSkipNextListingsSync) {
        shouldSkipNextListingsSync = false;
        return sortListings(existing);
      }

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);

      const upserts = await getTrpcClient().dashboardDb.listing.sync.query({
        since: last ?? null,
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
  }),
);

type InsertDraft = RouterInputs["dashboardDb"]["listing"]["create"];
export async function insertListing(draft: InsertDraft) {
  return runWithDashboardRefreshLock(async () => {
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

    if (draft.cultivarReferenceId) {
      try {
        await ensureCultivarReferencesCached([draft.cultivarReferenceId]);
      } catch {
        // ignore cache helper failures
      }
    }

    schedulePersistDashboardDbForCurrentUser();
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
      const updated = await getTrpcClient().dashboardDb.listing.update.mutate(
        draft,
      );
      listingsCollection.utils.writeUpdate(updated);
      schedulePersistDashboardDbForCurrentUser();
    } catch (error) {
      if (previous) listingsCollection.utils.writeUpdate(previous);
      throw error;
    }
  });
}

export async function deleteListing({ id }: { id: string }) {
  await runWithDashboardRefreshLock(async () => {
    const previous = listingsCollection.get(id);
    DELETED_IDS.add(id);
    listingsCollection.utils.writeDelete(id);

    try {
      await getTrpcClient().dashboardDb.listing.delete.mutate({ id });
      schedulePersistDashboardDbForCurrentUser({ delayMs: 0 });
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
    const updated = await getTrpcClient().dashboardDb.listing.linkAhs.mutate(
      draft,
    );
    listingsCollection.utils.writeUpdate(updated);

    if (updated.cultivarReferenceId) {
      try {
        await ensureCultivarReferencesCached([updated.cultivarReferenceId]);
      } catch {
        // ignore cache helper failures
      }
    }

    schedulePersistDashboardDbForCurrentUser();
    return updated;
  });
}

type UnlinkAhsDraft = RouterInputs["dashboardDb"]["listing"]["unlinkAhs"];
export async function unlinkAhs(draft: UnlinkAhsDraft) {
  return runWithDashboardRefreshLock(async () => {
    const updated = await getTrpcClient().dashboardDb.listing.unlinkAhs.mutate(
      draft,
    );
    listingsCollection.utils.writeUpdate(updated);
    schedulePersistDashboardDbForCurrentUser();
    return updated;
  });
}

type SyncAhsNameDraft = RouterInputs["dashboardDb"]["listing"]["syncAhsName"];
export async function syncAhsName(draft: SyncAhsNameDraft) {
  return runWithDashboardRefreshLock(async () => {
    const updated =
      await getTrpcClient().dashboardDb.listing.syncAhsName.mutate(draft);
    listingsCollection.utils.writeUpdate(updated);
    schedulePersistDashboardDbForCurrentUser();
    return updated;
  });
}

export async function refreshListingsCollectionFromServer(userId: string) {
  await refreshDashboardDbCollectionFromServer({
    userId,
    queryKey: QUERY_KEY,
    cursorBase: CURSOR_BASE,
    fetchRows: () =>
      getTrpcClient().dashboardDb.listing.sync.query({
        since: null,
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
