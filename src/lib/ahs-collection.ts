"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { QueryClient } from "@tanstack/query-core";
import type { RouterOutputs } from "@/trpc/react";
import {
  getQueryClient as getClientQueryClient,
  getTrpcClient,
} from "@/trpc/client";

let _queryClient: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (_queryClient) return _queryClient;
  _queryClient = getClientQueryClient();
  return _queryClient;
};

const CURSOR_KEY = "ahs:maxUpdatedAt";
const DELETED_IDS = new Set<string>();

export type AhsCollectionItem =
  RouterOutputs["dashboardTwo"]["getAhsForUserListings"][number];

export const ahsCollection = createCollection(
  queryCollectionOptions<AhsCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: ["dashboard-two", "ahs"],
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existingData: AhsCollectionItem[] =
        client.getQueryData(queryKey) ?? [];

      // Fetch only the user's referenced AHS rows
      const trpc = getTrpcClient();
      const newData = await trpc.dashboardTwo.getAhsForUserListings.query();

      const existingMap = new Map(existingData.map((item) => [item.id, item]));
      newData.forEach((item) => {
        existingMap.set(item.id, item);
      });
      DELETED_IDS.forEach((id) => existingMap.delete(id));

      // Cursor not used anymore; still bump to mark a run
      localStorage.setItem(CURSOR_KEY, new Date().toISOString());

      return Array.from(existingMap.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

export async function initializeAhsCollection() {
  const trpc = getTrpcClient();
  const queryClient = getQueryClient();
  const rows = await trpc.dashboardTwo.getAhsForUserListings.query();
  queryClient.setQueryData<AhsCollectionItem[]>(["dashboard-two", "ahs"], rows);
  localStorage.setItem(CURSOR_KEY, new Date().toISOString());
}

export async function ensureAhsCached(ids: string[]) {
  if (!ids.length) return [] as AhsCollectionItem[];
  const missing = ids.filter((id) => !ahsCollection.get(id));
  if (missing.length === 0) return [] as AhsCollectionItem[];
  const trpc = getTrpcClient();
  const rows = (await trpc.dashboardTwo.getAhsByIds.query({
    ids: missing,
  })) as AhsCollectionItem[];
  if (rows.length) {
    ahsCollection.utils.writeInsert(rows);
  }
  return rows;
}
