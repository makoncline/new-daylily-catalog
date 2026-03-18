"use client";

import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getTrpcClient } from "@/trpc/client";
import { makeInsertWithSwap } from "@/lib/utils/collection-utils";
import { omitUndefined } from "@/lib/utils/omit-undefined";
import {
  ensureCultivarReferencesCached,
} from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { schedulePersistDashboardDbForCurrentUser } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import { createDashboardDbCollection } from "./dashboard-db-collection-factory";
import { DASHBOARD_DB_QUERY_KEYS, DASHBOARD_DB_CURSOR_BASES } from "./dashboard-db-keys";

export type ListingCollectionItem =
  RouterOutputs["dashboardDb"]["listing"]["list"][number];

export const {
  collection: listingsCollection,
  deletedIds: listingDeletedIds,
  initialize: initializeDashboardListingsCollection,
} = createDashboardDbCollection<ListingCollectionItem>({
  cursorBase: DASHBOARD_DB_CURSOR_BASES.listings,
  getKey: (row) => row.id,
  queryKey: DASHBOARD_DB_QUERY_KEYS.listings,
  seed: () => getTrpcClient().dashboardDb.listing.list.query(),
  sync: (since) => getTrpcClient().dashboardDb.listing.sync.query({ since }),
});

const DELETED_IDS = listingDeletedIds;

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

  schedulePersistDashboardDbForCurrentUser();
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
    schedulePersistDashboardDbForCurrentUser();
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
    schedulePersistDashboardDbForCurrentUser({ delayMs: 0 });
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

  schedulePersistDashboardDbForCurrentUser();
  return updated;
}

type UnlinkAhsDraft = RouterInputs["dashboardDb"]["listing"]["unlinkAhs"];
export async function unlinkAhs(draft: UnlinkAhsDraft) {
  const updated = await getTrpcClient().dashboardDb.listing.unlinkAhs.mutate(
    draft,
  );
  listingsCollection.utils.writeUpdate(updated);
  schedulePersistDashboardDbForCurrentUser();
  return updated;
}

type SyncAhsNameDraft = RouterInputs["dashboardDb"]["listing"]["syncAhsName"];
export async function syncAhsName(draft: SyncAhsNameDraft) {
  const updated =
    await getTrpcClient().dashboardDb.listing.syncAhsName.mutate(draft);
  listingsCollection.utils.writeUpdate(updated);
  schedulePersistDashboardDbForCurrentUser();
  return updated;
}

export async function initializeListingsCollection(userId: string) {
  await initializeDashboardListingsCollection(userId);
}
