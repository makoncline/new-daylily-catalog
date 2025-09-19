"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import {
  getQueryClient as getClientQueryClient,
  getTrpcClient,
} from "@/trpc/client";
import { makeInsertWithSwap } from "../../../lib/utils/collection-utils";
import { cursorKey, getUserCursorKey } from "@/lib/utils/cursor";

const CURSOR_BASE = "lists:maxUpdatedAt";
const DELETED_IDS = new Set<string>();

export type ListCollectionItem =
  RouterOutputs["dashboardTwo"]["getLists"][number];

export const listsCollection = createCollection(
  queryCollectionOptions<ListCollectionItem>({
    queryClient: getClientQueryClient(),
    queryKey: ["dashboard-two", "lists"],
    enabled: false,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existingData: ListCollectionItem[] =
        client.getQueryData(queryKey) ?? [];

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const lastSyncTime = localStorage.getItem(cursorKeyToUse);
      const newData = await getTrpcClient().dashboardTwo.syncLists.query({
        since: lastSyncTime ?? null,
      });

      const map = new Map(existingData.map((item) => [item.id, item]));
      newData.forEach((item) => map.set(item.id, item));

      // apply tombstones so deleted items don't get re-added by incremental merges
      DELETED_IDS.forEach((id) => map.delete(id));

      localStorage.setItem(cursorKeyToUse, new Date().toISOString());
      return Array.from(map.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

type InsertListDraft = RouterInputs["dashboardTwo"]["insertList"];
export async function insertList(listDraft: InsertListDraft) {
  const run = makeInsertWithSwap<InsertListDraft, ListCollectionItem>({
    collection: listsCollection,
    makeTemp: (d) => ({
      id: `temp:${crypto.randomUUID()}`,
      title: d.title,
      userId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      status: null,
      listings: [],
    }),
    serverInsert: async (d) => {
      const serverResult =
        await getTrpcClient().dashboardTwo.insertList.mutate(d);
      // Merge server result with expected shape (listings will be populated on next sync)
      return { ...serverResult, listings: [] };
    },
  });

  return run(listDraft);
}

type UpdateListDraft = RouterInputs["dashboardTwo"]["updateList"];
export async function updateList(listDraft: UpdateListDraft) {
  const previous = listsCollection.get(listDraft.id);

  // Optimistic: just update the single mutable field
  listsCollection.utils.writeUpdate({
    id: listDraft.id,
    title: listDraft.title,
  });

  try {
    await getTrpcClient().dashboardTwo.updateList.mutate(listDraft);
  } catch (error) {
    if (previous) listsCollection.utils.writeUpdate(previous);
    throw error;
  }
}

export async function deleteList({ id }: { id: string }) {
  const previous = listsCollection.get(id);

  // optimistic delete + mark tombstone
  DELETED_IDS.add(id);
  listsCollection.utils.writeDelete(id);

  try {
    await getTrpcClient().dashboardTwo.deleteList.mutate({ id });
  } catch (error) {
    // rollback: restore row and clear tombstone
    if (previous) listsCollection.utils.writeInsert(previous);
    DELETED_IDS.delete(id);
    throw error;
  }
}

export async function addListingToList({
  listId,
  listingId,
}: {
  listId: string;
  listingId: string;
}) {
  const previous = listsCollection.get(listId);
  const prevListings = previous?.listings ?? [];

  listsCollection.utils.writeUpdate({
    id: listId,
    listings: [...prevListings, { id: listingId }].filter(
      (v, i, a) => a.findIndex((x) => x.id === v.id) === i,
    ),
  });

  try {
    await getTrpcClient().dashboardTwo.addListingToList.mutate({
      listId,
      listingId,
    });
  } catch (error) {
    if (previous) listsCollection.utils.writeUpdate(previous);
    throw error;
  }
}

export async function removeListingFromList({
  listId,
  listingId,
}: {
  listId: string;
  listingId: string;
}) {
  const previous = listsCollection.get(listId);
  const prevListings = previous?.listings ?? [];

  const nextListings = prevListings.filter((x) => x.id !== listingId);

  listsCollection.utils.writeUpdate({ id: listId, listings: nextListings });

  try {
    await getTrpcClient().dashboardTwo.removeListingFromList.mutate({
      listId,
      listingId,
    });
  } catch (error) {
    if (previous) listsCollection.utils.writeUpdate(previous);
    throw error;
  }
}

export async function initializeListsCollection(userId: string) {
  const trpc = getTrpcClient();
  const queryClient = getClientQueryClient();

  // Fetch the full set of lists
  const lists = await trpc.dashboardTwo.getLists.query();

  // Seed the query cache used by the collection's queryFn
  queryClient.setQueryData<ListCollectionItem[]>(
    ["dashboard-two", "lists"],
    lists,
  );

  // Advance the sync cursor so the next incremental sync only fetches changes
  const cursorKeyToUse = cursorKey(CURSOR_BASE, userId);
  localStorage.setItem(cursorKeyToUse, new Date().toISOString());

  // Clear stale tombstones on fresh seed
  DELETED_IDS.clear();
}
