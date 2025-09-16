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

const CURSOR_KEY = "listings:maxUpdatedAt";
// In-memory tombstones to prevent re-adding deleted items during incremental merges
const DELETED_IDS = new Set<string>();

export type ListingCollectionItem = Optional<
  RouterOutputs["dashboardTwo"]["getListings"][number]
> & {
  id: string;
  title: string;
};

export const listingsCollection = createCollection(
  queryCollectionOptions<ListingCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: ["dashboard-two", "listings"],
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existingData: ListingCollectionItem[] =
        client.getQueryData(queryKey) ?? [];
      console.log("~~existingData", existingData);

      const lastSyncTime = localStorage.getItem(CURSOR_KEY);
      const newData = await getTrpcClient().dashboardTwo.syncListings.query({
        since: lastSyncTime ?? null,
      });
      console.log("~~newData", newData);

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
      const { modified: tempListing } = transaction.mutations[0];

      await getTrpcClient().dashboardTwo.insertListing.mutate({
        title: tempListing.title,
      });
    },
    onUpdate: async ({ transaction }) => {
      const { modified: tempListing } = transaction.mutations[0];

      await getTrpcClient().dashboardTwo.updateListing.mutate({
        id: tempListing.id,
        title: tempListing.title,
      });
    },
    onDelete: async ({ transaction }) => {
      const { modified: tempListing } = transaction.mutations[0];

      await getTrpcClient().dashboardTwo.deleteListing.mutate({
        id: tempListing.id,
      });

      DELETED_IDS.add(tempListing.id);
    },
  }),
);

export async function insertListing({ title }: { title?: string }) {
  const tempId = `temp:${crypto.randomUUID()}`;
  listingsCollection.insert({
    id: tempId,
    title: title ?? `New Listing`,
  });
}

export async function updateListing({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  listingsCollection.update(id, (draft) => {
    draft.title = title;
  });
}

export async function deleteListing({ id }: { id: string }) {
  listingsCollection.delete(id);
}
