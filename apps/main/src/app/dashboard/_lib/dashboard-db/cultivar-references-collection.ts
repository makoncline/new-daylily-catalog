"use client";

import { createCollection, type Collection } from "@tanstack/react-db";
import {
  queryCollectionOptions,
  type QueryCollectionUtils,
} from "@tanstack/query-db-collection";
import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";
import type { RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { getUserCursorKey } from "@/lib/utils/cursor";
import {
  fetchDashboardSyncPages,
  refreshDashboardDbCollectionFromServer,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";
import {
  dashboardDbCollectionId,
  withDashboardDbPersistence,
} from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persisted-options";

const CURSOR_BASE = "dashboard-db:cultivar-references:maxUpdatedAt";
const QUERY_KEY = ["dashboard-db", "cultivar-references"] as const;
const CULTIVAR_REFERENCES_SYNC_PAGE_SIZE = 50;
let shouldSkipNextCultivarReferencesSync = false;

export type CultivarReferenceCollectionItem =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];
type CultivarReferenceCollection = Collection<
  CultivarReferenceCollectionItem,
  string,
  QueryCollectionUtils<CultivarReferenceCollectionItem>
>;

function sortCultivarReferences(
  rows: readonly CultivarReferenceCollectionItem[],
) {
  return [...rows].sort(
    (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime(),
  );
}

export function suppressNextCultivarReferencesCollectionSync() {
  shouldSkipNextCultivarReferencesSync = true;
}

export function clearNextCultivarReferencesCollectionSyncSuppression() {
  shouldSkipNextCultivarReferencesSync = false;
}

export async function cleanupCultivarReferencesCollection() {
  shouldSkipNextCultivarReferencesSync = false;
  await cultivarReferencesCollection.cleanup();
}

function getExistingCultivarReferenceRows(
  queryKey: readonly unknown[],
): CultivarReferenceCollectionItem[] {
  const queryRows: CultivarReferenceCollectionItem[] =
    getQueryClient().getQueryData(queryKey) ?? [];
  const collectionRows: CultivarReferenceCollectionItem[] = Array.from(
    cultivarReferencesCollection.values(),
  );

  return queryRows.length >= collectionRows.length ? queryRows : collectionRows;
}

function createCultivarReferencesCollection(
  persistence: PersistedCollectionPersistence | null,
  userId: string | null,
): CultivarReferenceCollection {
  const options = queryCollectionOptions<CultivarReferenceCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: QUERY_KEY,
    enabled: true,
    staleTime: Infinity,
    retry: false,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey }) => {
      const existing = getExistingCultivarReferenceRows(queryKey);

      if (shouldSkipNextCultivarReferencesSync) {
        shouldSkipNextCultivarReferencesSync = false;
        return sortCultivarReferences(existing);
      }

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);
      const upserts = await fetchDashboardSyncPages({
        label: "cultivarReference.sync",
        since: last ?? null,
        pageSize: CULTIVAR_REFERENCES_SYNC_PAGE_SIZE,
        fetchPage: (input) =>
          getTrpcClient().dashboardDb.cultivarReference.sync.query(input),
      });

      const map = new Map(existing.map((row) => [row.id, row]));
      upserts.forEach((row) => map.set(row.id, row));

      writeCursorFromRows({ cursorStorageKey: cursorKeyToUse, rows: upserts });
      return sortCultivarReferences(Array.from(map.values()));
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  });

  return createCollection(
    withDashboardDbPersistence<CultivarReferenceCollectionItem>({
      options,
      persistence,
      collectionId: dashboardDbCollectionId({
        name: "cultivar-references",
        userId,
      }),
    }) as Parameters<typeof createCollection>[0],
  ) as unknown as CultivarReferenceCollection;
}

export let cultivarReferencesCollection: CultivarReferenceCollection =
  createCultivarReferencesCollection(null, null);

export function resetCultivarReferencesCollectionWithPersistence(
  persistence: PersistedCollectionPersistence | null,
  userId: string | null,
) {
  shouldSkipNextCultivarReferencesSync = false;
  cultivarReferencesCollection = createCultivarReferencesCollection(
    persistence,
    userId,
  );
}

async function refreshCultivarReferencesCollectionFromServer(userId: string) {
  await refreshDashboardDbCollectionFromServer({
    userId,
    queryKey: QUERY_KEY,
    cursorBase: CURSOR_BASE,
    fetchRows: () =>
      fetchDashboardSyncPages({
        label: "cultivarReference.full-refresh",
        since: null,
        pageSize: CULTIVAR_REFERENCES_SYNC_PAGE_SIZE,
        fetchPage: (input) =>
          getTrpcClient().dashboardDb.cultivarReference.sync.query(input),
      }),
    sortRows: sortCultivarReferences,
  });
}

export async function initializeCultivarReferencesCollection(userId: string) {
  await refreshCultivarReferencesCollectionFromServer(userId);
  suppressNextCultivarReferencesCollectionSync();
  await cultivarReferencesCollection.preload();
}

export async function ensureCultivarReferencesCached(ids: string[]) {
  if (!ids.length) return [];

  const unique = Array.from(new Set(ids));
  const missing = unique.filter((id) => !cultivarReferencesCollection.get(id));
  if (!missing.length) return [];

  const rows =
    await getTrpcClient().dashboardDb.cultivarReference.getByIds.query({
      ids: missing,
    });

  if (rows.length) {
    cultivarReferencesCollection.utils.writeBatch(() => {
      rows.forEach((row) => {
        if (cultivarReferencesCollection.get(row.id)) {
          cultivarReferencesCollection.utils.writeUpdate(row);
        } else {
          cultivarReferencesCollection.utils.writeInsert(row);
        }
      });
    });
  }

  return rows;
}
