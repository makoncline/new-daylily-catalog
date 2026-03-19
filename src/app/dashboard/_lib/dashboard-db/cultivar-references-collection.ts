"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { getUserCursorKey } from "@/lib/utils/cursor";
import {
  refreshDashboardDbCollectionFromServer,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";

const CURSOR_BASE = "dashboard-db:cultivar-references:maxUpdatedAt";
const QUERY_KEY = ["dashboard-db", "cultivar-references"] as const;
let shouldSkipNextCultivarReferencesSync = false;

export type CultivarReferenceCollectionItem =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];

function sortCultivarReferences(
  rows: readonly CultivarReferenceCollectionItem[],
) {
  return [...rows].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
}

export function suppressNextCultivarReferencesCollectionSync() {
  shouldSkipNextCultivarReferencesSync = true;
}

export const cultivarReferencesCollection = createCollection(
  queryCollectionOptions<CultivarReferenceCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: QUERY_KEY,
    enabled: true,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey }) => {
      const existing: CultivarReferenceCollectionItem[] =
        getQueryClient().getQueryData(queryKey) ?? [];

      if (shouldSkipNextCultivarReferencesSync) {
        shouldSkipNextCultivarReferencesSync = false;
        return sortCultivarReferences(existing);
      }

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);
      const upserts = await getTrpcClient().dashboardDb.cultivarReference.sync.query({
        since: last ?? null,
      });

      const map = new Map(existing.map((row) => [row.id, row]));
      upserts.forEach((row) => map.set(row.id, row));

      writeCursorFromRows({ cursorStorageKey: cursorKeyToUse, rows: upserts });
      return sortCultivarReferences(Array.from(map.values()));
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

export async function refreshCultivarReferencesCollectionFromServer(
  userId: string,
) {
  await refreshDashboardDbCollectionFromServer({
    userId,
    queryKey: QUERY_KEY,
    cursorBase: CURSOR_BASE,
    fetchRows: () =>
      getTrpcClient().dashboardDb.cultivarReference.sync.query({
        since: null,
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

  const rows = await getTrpcClient().dashboardDb.cultivarReference.getByIds.query({
    ids: missing,
  });

  if (rows.length) {
    cultivarReferencesCollection.utils.writeBatch(() => {
      rows.forEach((row) => {
        if (!cultivarReferencesCollection.get(row.id)) {
          cultivarReferencesCollection.utils.writeInsert(row);
        }
      });
    });
  }

  return rows;
}
