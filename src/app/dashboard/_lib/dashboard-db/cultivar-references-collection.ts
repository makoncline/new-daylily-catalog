"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import {
  getUserCursorKey,
} from "@/lib/utils/cursor";
import {
  bootstrapDashboardDbCollection,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";

const CURSOR_BASE = "dashboard-db:cultivar-references:maxUpdatedAt";

export type CultivarReferenceCollectionItem =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];

export const cultivarReferencesCollection = createCollection(
  queryCollectionOptions<CultivarReferenceCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: ["dashboard-db", "cultivar-references"],
    enabled: true,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey }) => {
      const existing: CultivarReferenceCollectionItem[] =
        getQueryClient().getQueryData(queryKey) ?? [];

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);
      const upserts = await getTrpcClient().dashboardDb.cultivarReference.sync.query({
        since: last ?? null,
      });

      const map = new Map(existing.map((row) => [row.id, row]));
      upserts.forEach((row) => map.set(row.id, row));

      writeCursorFromRows({ cursorStorageKey: cursorKeyToUse, rows: upserts });
      return Array.from(map.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

export async function initializeCultivarReferencesCollection(userId: string) {
  await bootstrapDashboardDbCollection<CultivarReferenceCollectionItem>({
    userId,
    queryKey: ["dashboard-db", "cultivar-references"],
    cursorBase: CURSOR_BASE,
    collection: cultivarReferencesCollection,
    fetchSeed: () =>
      getTrpcClient().dashboardDb.cultivarReference.listForUserListings.query(),
  });
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
