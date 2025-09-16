"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

import { type Optional } from "prisma/generated/sqlite-client/runtime/library";
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
    onInsert: async ({ transaction }) => {
      const { modified: tempList } = transaction.mutations[0];

      await getTrpcClient().dashboardTwo.insertList.mutate({
        title: tempList.title,
      });
    },
    onUpdate: async ({ transaction }) => {
      const { modified: tempList } = transaction.mutations[0];

      await getTrpcClient().dashboardTwo.updateList.mutate({
        id: tempList.id,
        title: tempList.title,
      });
    },
    onDelete: async ({ transaction }) => {
      const { modified: tempList } = transaction.mutations[0];

      await getTrpcClient().dashboardTwo.deleteList.mutate({
        id: tempList.id,
      });

      DELETED_IDS.add(tempList.id);
    },
  }),
);

export async function insertList({ title }: { title?: string }) {
  const tempId = `temp:${crypto.randomUUID()}`;
  listsCollection.insert({
    id: tempId,
    title: title ?? `New List`,
  });
}

export async function updateList({ id, title }: { id: string; title: string }) {
  listsCollection.update(id, (draft) => {
    draft.title = title;
  });
}

export async function deleteList({ id }: { id: string }) {
  listsCollection.delete(id);
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
