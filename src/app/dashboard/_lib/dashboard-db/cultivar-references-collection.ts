"use client";

import type { RouterOutputs } from "@/trpc/react";
import { getTrpcClient } from "@/trpc/client";
import { createDashboardDbCollection } from "./dashboard-db-collection-factory";
import { DASHBOARD_DB_CURSOR_BASES, DASHBOARD_DB_QUERY_KEYS } from "./dashboard-db-keys";

export type CultivarReferenceCollectionItem =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];

export const {
  collection: cultivarReferencesCollection,
  initialize: initializeDashboardCultivarReferencesCollection,
} = createDashboardDbCollection<CultivarReferenceCollectionItem>({
  cursorBase: DASHBOARD_DB_CURSOR_BASES.cultivarReferences,
  getKey: (row) => row.id,
  queryKey: DASHBOARD_DB_QUERY_KEYS.cultivarReferences,
  seed: () => getTrpcClient().dashboardDb.cultivarReference.listForUserListings.query(),
  sync: (since) => getTrpcClient().dashboardDb.cultivarReference.sync.query({ since }),
});

export async function initializeCultivarReferencesCollection(userId: string) {
  await initializeDashboardCultivarReferencesCollection(userId);
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
