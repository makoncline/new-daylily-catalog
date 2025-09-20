"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterOutputs } from "@/trpc/react";
import {
  getQueryClient as getClientQueryClient,
  getTrpcClient,
} from "@/trpc/client";
import { cursorKey, getUserCursorKey } from "@/lib/utils/cursor";

const CURSOR_BASE = "ahs:maxUpdatedAt";

export type AhsCollectionItem =
  RouterOutputs["dashboardTwo"]["getAhsForUserListings"][number];

// We only ever cache AHS rows referenced by the user's listings.
// No tombstones are needed: unlinking simply leaves the extra rows harmlessly cached.
export const ahsCollection = createCollection(
  queryCollectionOptions<AhsCollectionItem>({
    queryClient: getClientQueryClient(),
    queryKey: ["dashboard-two", "ahs"],
    enabled: false,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existing: AhsCollectionItem[] = client.getQueryData(queryKey) ?? [];

      // Fetch fresh set of *referenced* AHS rows and merge by id
      const trpc = getTrpcClient();
      const fresh = await trpc.dashboardTwo.getAhsForUserListings.query();

      const map = new Map(existing.map((i) => [i.id, i]));
      fresh.forEach((i) => map.set(i.id, i));

      // Cursor not functionally used (no incremental endpoint), but we keep it to mark runs
      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      localStorage.setItem(cursorKeyToUse, new Date().toISOString());
      return Array.from(map.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

/**
 * Seed the cache once, used by the page init flow.
 */
export async function initializeAhsCollection(userId: string) {
  const trpc = getTrpcClient();
  const qc = getClientQueryClient();
  const rows = await trpc.dashboardTwo.getAhsForUserListings.query();
  qc.setQueryData<AhsCollectionItem[]>(["dashboard-two", "ahs"], rows);
  const cursorKeyToUse = cursorKey(CURSOR_BASE, userId);
  localStorage.setItem(cursorKeyToUse, new Date().toISOString());
}

/**
 * Ensure specific AHS ids are present in the cache (used when linking a listing).
 * No-ops for already-cached ids.
 */
export async function ensureAhsCached(ids: string[]) {
  if (!ids.length) return [] as AhsCollectionItem[];

  const missing = ids.filter((id) => !ahsCollection.get(id));
  if (missing.length === 0) return [] as AhsCollectionItem[];

  const trpc = getTrpcClient();
  const rows = (await trpc.dashboardTwo.getAhsByIds.query({
    ids: missing,
  })) as AhsCollectionItem[];
  if (rows.length) {
    ahsCollection.utils.writeBatch(() => {
      rows.forEach((r) => ahsCollection.utils.writeInsert(r));
    });
  }
  return rows;
}
