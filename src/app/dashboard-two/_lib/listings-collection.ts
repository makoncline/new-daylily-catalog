"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import {
  getQueryClient as getClientQueryClient,
  getTrpcClient,
} from "@/trpc/client";
import { makeInsertWithSwap } from "../../../lib/utils/collection-utils";
import { omitUndefined } from "../../../lib/utils/omit-undefined";
import { ensureAhsCached } from "./ahs-collection";
import { cursorKey, getUserCursorKey } from "@/lib/utils/cursor";

const CURSOR_BASE = "listings:maxUpdatedAt";
const DELETED_IDS = new Set<string>();

export type ListingCollectionItem =
  RouterOutputs["dashboardTwo"]["getListings"][number];

export const listingsCollection = createCollection(
  queryCollectionOptions<ListingCollectionItem>({
    queryClient: getClientQueryClient(),
    queryKey: ["dashboard-two", "listings"],
    enabled: false,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey, client }) => {
      const existing: ListingCollectionItem[] =
        client.getQueryData(queryKey) ?? [];

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);
      const upserts = await getTrpcClient().dashboardTwo.syncListings.query({
        since: last ?? null,
      });

      const map = new Map(existing.map((i) => [i.id, i]));
      upserts.forEach((i) => map.set(i.id, i));
      // prevent re-adding recently deleted items during incremental merge
      DELETED_IDS.forEach((id) => map.delete(id));

      localStorage.setItem(cursorKeyToUse, new Date().toISOString());
      return Array.from(map.values());
    },
    onInsert: async () => ({ refetch: false }),
    onUpdate: async () => ({ refetch: false }),
    onDelete: async () => ({ refetch: false }),
  }),
);

// INSERT

type InsertListingDraft = RouterInputs["dashboardTwo"]["insertListing"];
export async function insertListing(draft: InsertListingDraft) {
  const run = makeInsertWithSwap<InsertListingDraft, ListingCollectionItem>({
    collection: listingsCollection,
    makeTemp: (d) => ({
      id: `temp:${crypto.randomUUID()}`,
      title: d.title,
      ahsId: d.ahsId ?? null,
      description: null,
      price: null,
      status: null,
      privateNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "",
      slug: "",
    }),
    serverInsert: (d) => getTrpcClient().dashboardTwo.insertListing.mutate(d),
  });

  const created = await run(draft);
  if (draft.ahsId) {
    try {
      await ensureAhsCached([draft.ahsId]);
    } catch {}
  }
  return created;
}

// UPDATE

type UpdateListingDraft = RouterInputs["dashboardTwo"]["updateListing"];
export async function updateListing(draft: UpdateListingDraft) {
  const previous = listingsCollection.get(draft.id);

  // Optimistic: apply only defined keys; nulls still mean "clear"
  listingsCollection.utils.writeUpdate({
    id: draft.id,
    ...omitUndefined(draft.data),
  });

  try {
    await getTrpcClient().dashboardTwo.updateListing.mutate(draft);
  } catch (err) {
    if (previous) listingsCollection.utils.writeUpdate(previous);
    throw err;
  }
}

// DELETE (with tombstone)

export async function deleteListing({ id }: { id: string }) {
  const previous = listingsCollection.get(id);
  DELETED_IDS.add(id);
  listingsCollection.utils.writeDelete(id);

  try {
    await getTrpcClient().dashboardTwo.deleteListing.mutate({ id });
  } catch (err) {
    if (previous) listingsCollection.utils.writeInsert(previous);
    DELETED_IDS.delete(id);
    throw err;
  }
}

// LINK/UNLINK AHS

type SetListingAhsIdDraft = RouterInputs["dashboardTwo"]["setListingAhsId"];
export async function setListingAhsId(draft: SetListingAhsIdDraft) {
  const previous = listingsCollection.get(draft.id);
  listingsCollection.utils.writeUpdate({ id: draft.id, ahsId: draft.ahsId });

  try {
    await getTrpcClient().dashboardTwo.setListingAhsId.mutate(draft);
    if (draft.ahsId) {
      await ensureAhsCached([draft.ahsId]);
    }
  } catch (err) {
    if (previous) listingsCollection.utils.writeUpdate(previous);
    throw err;
  }
}

// INIT

export async function initializeListingsCollection(userId: string) {
  const trpc = getTrpcClient();
  const qc = getClientQueryClient();
  const rows = await trpc.dashboardTwo.getListings.query();
  qc.setQueryData<ListingCollectionItem[]>(["dashboard-two", "listings"], rows);
  const cursorKeyToUse = cursorKey(CURSOR_BASE, userId);
  localStorage.setItem(cursorKeyToUse, new Date().toISOString());
  DELETED_IDS.clear(); // optional: clear stale tombstones on fresh seed
}
