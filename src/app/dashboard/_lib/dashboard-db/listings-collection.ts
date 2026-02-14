"use client";

import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { makeInsertWithSwap } from "@/lib/utils/collection-utils";
import { omitUndefined } from "@/lib/utils/omit-undefined";
import {
  ensureCultivarReferencesCached,
} from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { getUserCursorKey } from "@/lib/utils/cursor";
import {
  bootstrapDashboardDbCollection,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";

const CURSOR_BASE = "dashboard-db:listings:maxUpdatedAt";
const DELETED_IDS = new Set<string>();

export type ListingCollectionItem =
  RouterOutputs["dashboardDb"]["listing"]["list"][number];

export const listingsCollection = createCollection(
  queryCollectionOptions<ListingCollectionItem>({
    queryClient: getQueryClient(),
    queryKey: ["dashboard-db", "listings"],
    enabled: true,
    getKey: (row) => row.id,
    queryFn: async ({ queryKey }) => {
      const existing: ListingCollectionItem[] =
        getQueryClient().getQueryData(queryKey) ?? [];

      const cursorKeyToUse = getUserCursorKey(CURSOR_BASE);
      const last = localStorage.getItem(cursorKeyToUse);

      const upserts = await getTrpcClient().dashboardDb.listing.sync.query({
        since: last ?? null,
      });

      const map = new Map(existing.map((i) => [i.id, i]));
      upserts.forEach((i) => map.set(i.id, i));
      DELETED_IDS.forEach((id) => map.delete(id));

      writeCursorFromRows({ cursorStorageKey: cursorKeyToUse, rows: upserts });
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
    }),
    serverInsert: (d) => getTrpcClient().dashboardDb.listing.create.mutate(d),
  });

  const created = await run(draft);

  if (draft.cultivarReferenceId) {
    try {
      await ensureCultivarReferencesCached([draft.cultivarReferenceId]);
    } catch {}
  }

  return created;
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

type LinkAhsDraft = RouterInputs["dashboardDb"]["listing"]["linkAhs"];
export async function linkAhs(draft: LinkAhsDraft) {
  const updated = await getTrpcClient().dashboardDb.listing.linkAhs.mutate(
    draft,
  );
  listingsCollection.utils.writeUpdate(updated);

  if (updated.cultivarReferenceId) {
    try {
      await ensureCultivarReferencesCached([updated.cultivarReferenceId]);
    } catch {}
  }

  return updated;
}

type UnlinkAhsDraft = RouterInputs["dashboardDb"]["listing"]["unlinkAhs"];
export async function unlinkAhs(draft: UnlinkAhsDraft) {
  const updated = await getTrpcClient().dashboardDb.listing.unlinkAhs.mutate(
    draft,
  );
  listingsCollection.utils.writeUpdate(updated);
  return updated;
}

type SyncAhsNameDraft = RouterInputs["dashboardDb"]["listing"]["syncAhsName"];
export async function syncAhsName(draft: SyncAhsNameDraft) {
  const updated =
    await getTrpcClient().dashboardDb.listing.syncAhsName.mutate(draft);
  listingsCollection.utils.writeUpdate(updated);
  return updated;
}

export async function initializeListingsCollection(userId: string) {
  await bootstrapDashboardDbCollection<ListingCollectionItem>({
    userId,
    queryKey: ["dashboard-db", "listings"],
    cursorBase: CURSOR_BASE,
    collection: listingsCollection,
    fetchSeed: () => getTrpcClient().dashboardDb.listing.list.query(),
    onSeeded: () => {
      DELETED_IDS.clear();
    },
  });
}
