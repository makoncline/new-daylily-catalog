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
import { ensureAhsCached } from "./ahs-collection";

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

      const lastSyncTime = localStorage.getItem(CURSOR_KEY);
      const newData = await getTrpcClient().dashboardTwo.syncListings.query({
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
      // Server create handled by insertListing() with direct write swap
      return { refetch: false };
    },
    onUpdate: async () => {
      // Server update handled by updateListing() with direct writes
      return { refetch: false };
    },
    onDelete: async () => {
      // Server delete handled by deleteListing() with direct writes
      return { refetch: false };
    },
  }),
);

type InsertListingDraft = RouterInputs["dashboardTwo"]["insertListing"];
export async function insertListing(listingDraft: InsertListingDraft) {
  const run = makeInsertWithSwap<InsertListingDraft, ListingCollectionItem>({
    collection: listingsCollection,
    makeTemp: (listingDraft) => ({
      id: `temp:${crypto.randomUUID()}`,
      ...listingDraft,
    }),
    serverInsert: async (listingDraft) =>
      getTrpcClient().dashboardTwo.insertListing.mutate(listingDraft),
  });

  return run(listingDraft);
}

type UpdateListingDraft = RouterInputs["dashboardTwo"]["updateListing"];
export async function updateListing(listingDraft: UpdateListingDraft) {
  // Optimistic update directly on sync store
  const previous = listingsCollection.get(listingDraft.id);
  listingsCollection.utils.writeUpdate(listingDraft);

  try {
    await getTrpcClient().dashboardTwo.updateListing.mutate(listingDraft);
  } catch (error) {
    // Rollback on failure
    if (previous) {
      listingsCollection.utils.writeUpdate(previous);
    }
    throw error;
  }
}

export async function deleteListing({ id }: { id: string }) {
  // Optimistic delete on sync store
  const previous = listingsCollection.get(id);
  listingsCollection.utils.writeDelete(id);

  try {
    await getTrpcClient().dashboardTwo.deleteListing.mutate({ id });
  } catch (error) {
    // Rollback on failure
    if (previous) {
      listingsCollection.utils.writeInsert(previous);
    }
    throw error;
  }
}

type SetListingAhsIdDraft = RouterInputs["dashboardTwo"]["setListingAhsId"];
export async function setListingAhsId(draft: SetListingAhsIdDraft) {
  const previous = listingsCollection.get(draft.id);
  listingsCollection.utils.writeUpdate({
    id: draft.id,
    ahsId: draft.ahsId,
  });

  try {
    await getTrpcClient().dashboardTwo.setListingAhsId.mutate(draft);
    if (draft.ahsId) {
      try {
        await ensureAhsCached([draft.ahsId]);
      } catch {}
    }
  } catch (error) {
    if (previous) listingsCollection.utils.writeUpdate(previous);
    throw error;
  }
}

export async function initializeListingsCollection() {
  const trpc = getTrpcClient();
  const queryClient = getQueryClient();

  // Fetch the full set of listings
  const listings = await trpc.dashboardTwo.getListings.query();

  // Seed the query cache used by the collection's queryFn
  queryClient.setQueryData<ListingCollectionItem[]>(
    ["dashboard-two", "listings"],
    listings,
  );

  // Advance the sync cursor so the next incremental sync only fetches changes
  localStorage.setItem(CURSOR_KEY, new Date().toISOString());
}
