"use client";

import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getTrpcClient } from "@/trpc/client";
import { makeInsertWithSwap } from "@/lib/utils/collection-utils";
import { omitUndefined } from "@/lib/utils/omit-undefined";
import { schedulePersistDashboardDbForCurrentUser } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import { createDashboardDbCollection } from "./dashboard-db-collection-factory";
import { DASHBOARD_DB_CURSOR_BASES, DASHBOARD_DB_QUERY_KEYS } from "./dashboard-db-keys";

export type ListCollectionItem =
  RouterOutputs["dashboardDb"]["list"]["list"][number];

export const {
  collection: listsCollection,
  deletedIds: listDeletedIds,
  initialize: initializeDashboardListsCollection,
} = createDashboardDbCollection<ListCollectionItem>({
  cursorBase: DASHBOARD_DB_CURSOR_BASES.lists,
  getKey: (row) => row.id,
  queryKey: DASHBOARD_DB_QUERY_KEYS.lists,
  seed: () => getTrpcClient().dashboardDb.list.list.query(),
  sync: (since) => getTrpcClient().dashboardDb.list.sync.query({ since }),
});

const DELETED_IDS = listDeletedIds;

type InsertDraft = RouterInputs["dashboardDb"]["list"]["create"];
export async function insertList(draft: InsertDraft) {
  const run = makeInsertWithSwap<InsertDraft, ListCollectionItem>({
    collection: listsCollection,
    makeTemp: (d) => ({
      id: `temp:${crypto.randomUUID()}`,
      userId: "",
      title: d.title,
      description: d.description ?? null,
      status: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      listings: [],
    }),
    serverInsert: (d) => getTrpcClient().dashboardDb.list.create.mutate(d),
  });

  const created = await run(draft);
  schedulePersistDashboardDbForCurrentUser();
  return created;
}

type UpdateDraft = RouterInputs["dashboardDb"]["list"]["update"];
export async function updateList(draft: UpdateDraft) {
  const previous = listsCollection.get(draft.id);
  listsCollection.utils.writeUpdate({ id: draft.id, ...omitUndefined(draft.data) });

  try {
    const updated = await getTrpcClient().dashboardDb.list.update.mutate(draft);
    if (updated) listsCollection.utils.writeUpdate(updated);
    schedulePersistDashboardDbForCurrentUser();
  } catch (error) {
    if (previous) listsCollection.utils.writeUpdate(previous);
    throw error;
  }
}

export async function deleteList({ id }: { id: string }) {
  const previous = listsCollection.get(id);
  DELETED_IDS.add(id);
  listsCollection.utils.writeDelete(id);

  try {
    await getTrpcClient().dashboardDb.list.delete.mutate({ id });
    schedulePersistDashboardDbForCurrentUser({ delayMs: 0 });
  } catch (error) {
    if (previous) listsCollection.utils.writeInsert(previous);
    DELETED_IDS.delete(id);
    throw error;
  }
}

export async function addListingToList(args: {
  listId: string;
  listingId: string;
}) {
  const previous = listsCollection.get(args.listId);
  const prevListings = previous?.listings ?? [];
  listsCollection.utils.writeUpdate({
    id: args.listId,
    listings: [...prevListings, { id: args.listingId }].filter(
      (v, i, a) => a.findIndex((x: { id: string }) => x.id === v.id) === i,
    ),
  });

  try {
    const updated = await getTrpcClient().dashboardDb.list.addListingToList.mutate(
      args,
    );
    listsCollection.utils.writeUpdate(updated);
    schedulePersistDashboardDbForCurrentUser();
  } catch (error) {
    if (previous) listsCollection.utils.writeUpdate(previous);
    throw error;
  }
}

export async function removeListingFromList(args: {
  listId: string;
  listingId: string;
}) {
  const previous = listsCollection.get(args.listId);
  const prevListings = previous?.listings ?? [];
  listsCollection.utils.writeUpdate({
    id: args.listId,
    listings: prevListings.filter((x) => x.id !== args.listingId),
  });

  try {
    const updated =
      await getTrpcClient().dashboardDb.list.removeListingFromList.mutate(args);
    listsCollection.utils.writeUpdate(updated);
    schedulePersistDashboardDbForCurrentUser();
  } catch (error) {
    if (previous) listsCollection.utils.writeUpdate(previous);
    throw error;
  }
}

export async function initializeListsCollection(userId: string) {
  await initializeDashboardListsCollection(userId);
}
