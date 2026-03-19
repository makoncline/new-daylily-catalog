"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { makeInsertWithSwap } from "@/lib/utils/collection-utils";
import { omitUndefined } from "@/lib/utils/omit-undefined";
import { getUserCursorKey } from "@/lib/utils/cursor";
import {
  runWithDashboardRefreshLock,
  schedulePersistDashboardDbForCurrentUser,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import {
  refreshDashboardDbCollectionFromServer,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";

const CURSOR_BASE = "dashboard-db:lists:maxUpdatedAt";
const QUERY_KEY = ["dashboard-db", "lists"] as const;
const DELETED_IDS = new Set<string>();
let shouldSkipNextListsSync = false;

export type ListCollectionItem =
  RouterOutputs["dashboardDb"]["list"]["list"][number];

function sortLists(rows: readonly ListCollectionItem[]) {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function suppressNextListsCollectionSync() {
  shouldSkipNextListsSync = true;
}

export function clearNextListsCollectionSyncSuppression() {
  shouldSkipNextListsSync = false;
}

export async function cleanupListsCollection() {
  DELETED_IDS.clear();
  shouldSkipNextListsSync = false;
  await listsCollection.cleanup();
}

export const listsCollection = createCollection(
  queryCollectionOptions<ListCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: QUERY_KEY,
    enabled: true,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey }) => {
      const existing: ListCollectionItem[] =
        getQueryClient().getQueryData(queryKey) ?? [];

      if (shouldSkipNextListsSync) {
        shouldSkipNextListsSync = false;
        return sortLists(existing);
      }

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);
      const upserts = await getTrpcClient().dashboardDb.list.sync.query({
        since: last ?? null,
      });

      const map = new Map(existing.map((i) => [i.id, i]));
      upserts.forEach((i) => map.set(i.id, i));
      DELETED_IDS.forEach((id) => map.delete(id));

      writeCursorFromRows({ cursorStorageKey: cursorKeyToUse, rows: upserts });
      return sortLists(Array.from(map.values()));
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

type InsertDraft = RouterInputs["dashboardDb"]["list"]["create"];
export async function insertList(draft: InsertDraft) {
  return runWithDashboardRefreshLock(async () => {
    const run = makeInsertWithSwap<InsertDraft, ListCollectionItem>({
      collection: listsCollection,
      makeTemp: (d) => ({
        id: `temp:${crypto.randomUUID()}`,
        userId: "",
        title: d.title,
        description: d.description ?? null,
        status: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        listings: [],
      }),
      serverInsert: (d) => getTrpcClient().dashboardDb.list.create.mutate(d),
    });

    const created = await run(draft);
    schedulePersistDashboardDbForCurrentUser();
    return created;
  });
}

type UpdateDraft = RouterInputs["dashboardDb"]["list"]["update"];
export async function updateList(draft: UpdateDraft) {
  await runWithDashboardRefreshLock(async () => {
    const previous = listsCollection.get(draft.id);
    listsCollection.utils.writeUpdate({
      id: draft.id,
      ...omitUndefined(draft.data),
    });

    try {
      const updated = await getTrpcClient().dashboardDb.list.update.mutate(draft);
      if (updated) listsCollection.utils.writeUpdate(updated);
      schedulePersistDashboardDbForCurrentUser();
    } catch (error) {
      if (previous) listsCollection.utils.writeUpdate(previous);
      throw error;
    }
  });
}

export async function deleteList({ id }: { id: string }) {
  await runWithDashboardRefreshLock(async () => {
    const previous = listsCollection.get(id);
    DELETED_IDS.add(id);
    listsCollection.utils.writeDelete(id);

    try {
      await getTrpcClient().dashboardDb.list.delete.mutate({ id });
      schedulePersistDashboardDbForCurrentUser({ delayMs: 0 });
    } catch (error) {
      if (previous) listsCollection.utils.writeInsert(previous);
      DELETED_IDS.delete(id);
      throw error;
    }
  });
}

export async function addListingToList(args: {
  listId: string;
  listingId: string;
}) {
  await runWithDashboardRefreshLock(async () => {
    const previous = listsCollection.get(args.listId);
    const prevListings = previous?.listings ?? [];
    listsCollection.utils.writeUpdate({
      id: args.listId,
      listings: [...prevListings, { id: args.listingId }].filter(
        (v, i, a) => a.findIndex((x) => x.id === v.id) === i,
      ),
    });

    try {
      const updated =
        await getTrpcClient().dashboardDb.list.addListingToList.mutate(args);
      listsCollection.utils.writeUpdate(updated);
      schedulePersistDashboardDbForCurrentUser();
    } catch (error) {
      if (previous) listsCollection.utils.writeUpdate(previous);
      throw error;
    }
  });
}

export async function removeListingFromList(args: {
  listId: string;
  listingId: string;
}) {
  await runWithDashboardRefreshLock(async () => {
    const previous = listsCollection.get(args.listId);
    const prevListings = previous?.listings ?? [];
    listsCollection.utils.writeUpdate({
      id: args.listId,
      listings: prevListings.filter((x) => x.id !== args.listingId),
    });

    try {
      const updated =
        await getTrpcClient().dashboardDb.list.removeListingFromList.mutate(args);
      listsCollection.utils.writeUpdate(updated);
      schedulePersistDashboardDbForCurrentUser();
    } catch (error) {
      if (previous) listsCollection.utils.writeUpdate(previous);
      throw error;
    }
  });
}

export async function refreshListsCollectionFromServer(userId: string) {
  await refreshDashboardDbCollectionFromServer({
    userId,
    queryKey: QUERY_KEY,
    cursorBase: CURSOR_BASE,
    fetchRows: () =>
      getTrpcClient().dashboardDb.list.sync.query({
        since: null,
      }),
    sortRows: sortLists,
    filterRows: (row) => !DELETED_IDS.has(row.id),
  });
}

export async function initializeListsCollection(userId: string) {
  await refreshListsCollectionFromServer(userId);
  suppressNextListsCollectionSync();
  await listsCollection.preload();
}
