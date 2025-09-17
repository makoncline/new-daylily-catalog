"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

import { type Optional } from "prisma/generated/sqlite-client/runtime/library";
import type { QueryClient } from "@tanstack/query-core";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import {
  getQueryClient as getClientQueryClient,
  getTrpcClient,
} from "@/trpc/client";
import { makeInsertWithSwap } from "./utils/collection-utils";

let _queryClient: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (_queryClient) return _queryClient;
  _queryClient = getClientQueryClient();
  return _queryClient;
};

const CURSOR_KEY = "lists:maxUpdatedAt";
// In-memory tombstones to prevent re-adding deleted items during incremental merges
const DELETED_IDS = new Set<string>();

export type ListCollectionItem = Optional<
  RouterOutputs["dashboardTwo"]["getLists"][number]
> & {
  id: string;
  title: string;
};

export const listsCollection = createCollection(
  queryCollectionOptions<ListCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: ["dashboard-two", "lists"],
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existingData: ListCollectionItem[] =
        client.getQueryData(queryKey) ?? [];

      const lastSyncTime = localStorage.getItem(CURSOR_KEY);
      const newData = await getTrpcClient().dashboardTwo.syncLists.query({
        since: lastSyncTime ?? null,
      });

      const existingMap = new Map(existingData.map((item) => [item.id, item]));

      newData.forEach((item) => {
        existingMap.set(item.id, item);
      });

      // Remove any locally deleted items from the merged result
      DELETED_IDS.forEach((id) => existingMap.delete(id));

      localStorage.setItem(CURSOR_KEY, new Date().toISOString());

      return Array.from(existingMap.values());
    },
    onInsert: async () => {
      // Server create handled by insertList() with direct write swap
      return { refetch: false };
    },
    onUpdate: async () => {
      // Server update handled by updateList() with direct writes
      return { refetch: false };
    },
    onDelete: async () => {
      // Server delete handled by deleteList() with direct writes
      return { refetch: false };
    },
  }),
);

type InsertListDraft = RouterInputs["dashboardTwo"]["insertList"];
export async function insertList(listDraft: InsertListDraft) {
  const run = makeInsertWithSwap<InsertListDraft, ListCollectionItem>({
    collection: listsCollection,
    makeTemp: (listDraft) => ({
      id: `temp:${crypto.randomUUID()}`,
      ...listDraft,
      title: listDraft.title,
    }),
    serverInsert: async (listDraft) =>
      getTrpcClient().dashboardTwo.insertList.mutate(listDraft),
  });

  return run(listDraft);
}

type UpdateListDraft = RouterInputs["dashboardTwo"]["updateList"];
export async function updateList(listDraft: UpdateListDraft) {
  // Optimistic update directly on sync store
  const previous = listsCollection.get(listDraft.id);
  listsCollection.utils.writeUpdate(listDraft);

  try {
    await getTrpcClient().dashboardTwo.updateList.mutate(listDraft);
  } catch (error) {
    // Rollback on failure
    if (previous) {
      listsCollection.utils.writeUpdate(previous);
    }
    throw error;
  }
}

export async function deleteList({ id }: { id: string }) {
  // Optimistic delete on sync store
  const previous = listsCollection.get(id);
  listsCollection.utils.writeDelete(id);

  try {
    await getTrpcClient().dashboardTwo.deleteList.mutate({ id });
  } catch (error) {
    // Rollback on failure
    if (previous) {
      listsCollection.utils.writeInsert(previous);
    }
    throw error;
  }
}

export async function initializeListsCollection() {
  const trpc = getTrpcClient();
  const queryClient = getQueryClient();

  // Fetch the full set of lists
  const lists = await trpc.dashboardTwo.getLists.query();

  // Seed the query cache used by the collection's queryFn
  queryClient.setQueryData<ListCollectionItem[]>(
    ["dashboard-two", "lists"],
    lists,
  );

  // Advance the sync cursor so the next incremental sync only fetches changes
  localStorage.setItem(CURSOR_KEY, new Date().toISOString());

  // Intentionally do not start sync here; caller controls sync behavior
}
