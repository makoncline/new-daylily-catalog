"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { makeInsertWithSwap } from "@/lib/utils/collection-utils";
import { omitUndefined } from "@/lib/utils/omit-undefined";
import {
  cursorKey,
  getUserCursorKey,
  setCurrentUserId,
} from "@/lib/utils/cursor";

const CURSOR_BASE = "dashboard-db:listings:maxUpdatedAt";
const DELETED_IDS = new Set<string>();

export type ListingCollectionItem =
  RouterOutputs["dashboardDb"]["listing"]["list"][number];

export const listingsCollection = createCollection(
  queryCollectionOptions<ListingCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: ["dashboard-db", "listings"],
    enabled: false,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existing: ListingCollectionItem[] =
        client.getQueryData(queryKey) ?? [];

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);

      const upserts = await getTrpcClient().dashboardDb.listing.sync.query({
        since: last ?? null,
      });

      const map = new Map(existing.map((i) => [i.id, i]));
      upserts.forEach((i) => map.set(i.id, i));
      DELETED_IDS.forEach((id) => map.delete(id));

      localStorage.setItem(cursorKeyToUse, new Date().toISOString());
      return Array.from(map.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

type InsertDraft = RouterInputs["dashboardDb"]["listing"]["create"];
export async function insertListing(draft: InsertDraft) {
  const run = makeInsertWithSwap<InsertDraft, ListingCollectionItem>({
    collection: listingsCollection,
    makeTemp: (d) => ({
      id: `temp:${crypto.randomUUID()}`,
      userId: "",
      title: d.title,
      slug: "",
      price: null,
      description: null,
      privateNote: null,
      status: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      cultivarReferenceId: d.cultivarReferenceId ?? null,
      cultivarReference: null,
    }),
    serverInsert: (d) => getTrpcClient().dashboardDb.listing.create.mutate(d),
  });

  return run(draft);
}

type UpdateDraft = RouterInputs["dashboardDb"]["listing"]["update"];
export async function updateListing(draft: UpdateDraft) {
  const previous = listingsCollection.get(draft.id);

  listingsCollection.utils.writeUpdate({
    id: draft.id,
    ...omitUndefined(draft.data),
  });

  try {
    const updated = await getTrpcClient().dashboardDb.listing.update.mutate(
      draft,
    );
    listingsCollection.utils.writeUpdate(updated);
  } catch (error) {
    if (previous) listingsCollection.utils.writeUpdate(previous);
    throw error;
  }
}

export async function deleteListing({ id }: { id: string }) {
  const previous = listingsCollection.get(id);
  DELETED_IDS.add(id);
  listingsCollection.utils.writeDelete(id);

  try {
    await getTrpcClient().dashboardDb.listing.delete.mutate({ id });
  } catch (error) {
    if (previous) listingsCollection.utils.writeInsert(previous);
    DELETED_IDS.delete(id);
    throw error;
  }
}

export async function initializeListingsCollection(userId: string) {
  setCurrentUserId(userId);

  const rows = await getTrpcClient().dashboardDb.listing.list.query();
  getQueryClient().setQueryData<ListingCollectionItem[]>(
    ["dashboard-db", "listings"],
    rows,
  );

  localStorage.setItem(cursorKey(CURSOR_BASE, userId), new Date().toISOString());
  DELETED_IDS.clear();

  await listingsCollection.preload();
}
