"use client";

import {
  createCollection,
  createTransaction,
  type Collection,
} from "@tanstack/react-db";
import { QueryClient, type QueryFunctionContext } from "@tanstack/react-query";
import {
  queryCollectionOptions,
  type QueryCollectionUtils,
} from "@tanstack/query-db-collection";
import {
  persistQueryClient,
  type PersistedClient,
} from "@tanstack/query-persist-client-core";
import { get, set, del } from "idb-keyval";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { getTrpcClient } from "@/trpc/client";
import { omitUndefined } from "@/lib/utils/omit-undefined";
import { capturePosthogEvent } from "@/lib/analytics/posthog";

type Catalog = RouterOutputs["dashboardDb"]["bootstrap"]["catalog"];
export type ListingCollectionItem = Catalog["listings"][number];
export type ListCollectionItem = Catalog["lists"][number];
export type ImageCollectionItem = Catalog["images"][number];
export type CultivarReferenceCollectionItem =
  Catalog["cultivarReferences"][number];
type NativeCollection<T extends { id: string }> = Collection<
  T,
  string,
  QueryCollectionUtils<T, string>
>;
type Input = RouterInputs["dashboardDb"];

export let listingsCollection: NativeCollection<ListingCollectionItem>;
export let listsCollection: NativeCollection<ListCollectionItem>;
export let imagesCollection: NativeCollection<ImageCollectionItem>;
export let cultivarReferencesCollection: NativeCollection<CultivarReferenceCollectionItem>;
let session: ReturnType<typeof createSession>;

function createSession(userId: string) {
  let active = true;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: Infinity,
        retry: false,
      },
    },
  });
  const storageKey = `dashboard-tanstack:${userId}`;
  const [stopPersisting, restored] = persistQueryClient({
    queryClient,
    maxAge: Infinity,
    buster: "1",
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.data !== undefined,
    },
    persister: {
      restoreClient: () =>
        get<PersistedClient>(storageKey).catch(() => undefined),
      persistClient: async (client) => {
        if (!client.clientState.queries.length) return;
        // Persist confirmed data, including writes after a failed refresh.
        // A prior request error must not prevent loading that saved data.
        for (const query of client.clientState.queries)
          query.state = { ...query.state, status: "success", error: null };
        await set(storageKey, client).catch(() => {
          console.warn("Dashboard browser cache could not be saved");
        });
      },
      removeClient: () => del(storageKey).catch(() => undefined),
    },
  });
  const queryKey = ["dashboard-tanstack", userId];
  const queryFn = async ({ signal }: QueryFunctionContext) => {
    assertActive();
    return getTrpcClient().dashboardDb.bootstrap.catalog.query(undefined, {
      signal,
    });
  };
  function assertActive() {
    if (!active) throw new Error("Dashboard session ended");
  }
  function collection<T extends { id: string }>(
    name: keyof Catalog,
    select: (catalog: Catalog) => T[],
  ): NativeCollection<T> {
    const options = queryCollectionOptions<
      T,
      typeof queryFn,
      Error,
      string[],
      string
    >({
      id: `dashboard-tanstack:${userId}:${name}`,
      queryClient,
      queryKey,
      queryFn,
      select,
      getKey: (row) => row.id,
      gcTime: Infinity,
    });
    return createCollection(options);
  }
  const listings = collection("listings", (catalog) => catalog.listings);
  const lists = collection("lists", (catalog) => catalog.lists);
  const images = collection("images", (catalog) => catalog.images);
  const references = collection(
    "cultivarReferences",
    (catalog) => catalog.cultivarReferences,
  );
  return {
    userId,
    listings,
    lists,
    images,
    references,
    restored,
    queryClient,
    queryOptions: { queryKey, queryFn },
    assertActive,
    async refresh() {
      assertActive();
      await queryClient.cancelQueries({ queryKey });
      await listings.utils.refetch({ throwOnError: true });
    },
    async dispose() {
      active = false;
      stopPersisting();
      await queryClient.cancelQueries();
      await Promise.all([
        listings.cleanup(),
        lists.cleanup(),
        images.cleanup(),
        references.cleanup(),
      ]);
      queryClient.clear();
    },
  };
}

// Route suspension can restart effects without discarding React state. Keep
// the member's client across navigation; only an account change replaces it.
export function createDashboard(userId: string) {
  if (session?.userId === userId) return session;
  if (session) void session.dispose();
  session = createSession(userId);
  listingsCollection = session.listings;
  listsCollection = session.lists;
  imagesCollection = session.images;
  cultivarReferencesCollection = session.references;
  return session;
}

// TanStack owns the optimistic layer and rollback. Confirm with the server row;
// a later refresh is independent of whether the command succeeded.
async function mutate<T>(
  optimistic: () => void,
  write: () => Promise<T>,
  confirm: (result: T) => Promise<void>,
) {
  const current = session;
  current.assertActive();
  const transaction = createTransaction({
    autoCommit: false,
    mutationFn: () => saved,
  });
  transaction.mutate(optimistic);
  const saved = write().then(async (result) => {
    current.assertActive();
    await confirm(result);
    return result;
  });
  await transaction.commit();
  return saved;
}

export async function insertListing(draft: Input["listing"]["create"]) {
  const current = session;
  current.assertActive();
  const first = current.listings.size === 0;
  const created =
    await getTrpcClient().dashboardDb.listing.create.mutate(draft);
  current.assertActive();
  await current.listings.utils.writeUpsert(created);
  await cacheListingReferences(current, [created]);
  if (first)
    capturePosthogEvent("first_listing_created", {
      listingId: created.id,
      cultivarLinked: Boolean(draft.cultivarReferenceId),
    });
  return created;
}
export function updateListing(draft: Input["listing"]["update"]) {
  const { listings } = session;
  return mutate(
    () =>
      listings.update(draft.id, (row) => {
        Object.assign(row, omitUndefined(draft.data));
      }),
    () => getTrpcClient().dashboardDb.listing.update.mutate(draft),
    (row) => listings.utils.writeUpsert(row),
  );
}
export function deleteListing(draft: Input["listing"]["delete"]) {
  const { listings, lists, images } = session;
  const imageIds = [...images.values()]
    .filter((row) => row.listingId === draft.id)
    .map((row) => row.id);
  const memberships = [...lists.values()]
    .filter((row) => row.listings.some((item) => item.id === draft.id))
    .map((row) => ({
      id: row.id,
      listings: row.listings.filter((item) => item.id !== draft.id),
    }));
  return mutate(
    () => {
      listings.delete(draft.id);
      if (imageIds.length) images.delete(imageIds);
      for (const list of memberships)
        lists.update(list.id, (row) => {
          row.listings = list.listings;
        });
    },
    () => getTrpcClient().dashboardDb.listing.delete.mutate(draft),
    async (result) => {
      await listings.utils.writeDelete(draft.id);
      if (imageIds.length) await images.utils.writeDelete(imageIds);
      if (result.lists.length) await lists.utils.writeUpsert(result.lists);
    },
  );
}
export async function loadMissingListing(id: string) {
  const current = session;
  const row = await getTrpcClient().dashboardDb.listing.get.query({ id });
  current.assertActive();
  await current.listings.utils.writeUpsert(row);
  await cacheListingReferences(current, [row]);
}
export async function loadListingsByIds(ids: string[]) {
  const current = session;
  const rows = await getTrpcClient().dashboardDb.listing.getByIds.query({
    ids,
  });
  current.assertActive();
  await current.listings.utils.writeUpsert(rows);
  await cacheListingReferences(current, rows);
}
export async function linkAhs(draft: Input["listing"]["linkAhs"]) {
  const current = session;
  const row = await getTrpcClient().dashboardDb.listing.linkAhs.mutate(draft);
  current.assertActive();
  await current.listings.utils.writeUpsert(row);
  await cacheListingReferences(current, [row]);
  return row;
}
export async function unlinkAhs(draft: Input["listing"]["unlinkAhs"]) {
  const current = session;
  const row = await getTrpcClient().dashboardDb.listing.unlinkAhs.mutate(draft);
  current.assertActive();
  await current.listings.utils.writeUpsert(row);
  return row;
}
export async function syncAhsName(draft: Input["listing"]["syncAhsName"]) {
  const current = session;
  const row =
    await getTrpcClient().dashboardDb.listing.syncAhsName.mutate(draft);
  current.assertActive();
  await current.listings.utils.writeUpsert(row);
  return row;
}
export async function ensureCultivarReferencesCached(ids: string[]) {
  return cacheReferences(session, ids);
}

async function cacheListingReferences(
  current: ReturnType<typeof createSession>,
  rows: ListingCollectionItem[],
) {
  await cacheReferences(
    current,
    rows.flatMap((row) =>
      row.cultivarReferenceId ? [row.cultivarReferenceId] : [],
    ),
  ).catch(() => {
    // Reference metadata is optional. Its failure must not reject a saved listing.
    console.warn("Could not load cultivar reference details");
  });
}

async function cacheReferences(
  current: ReturnType<typeof createSession>,
  ids: string[],
) {
  const missing = [...new Set(ids)].filter((id) => !current.references.has(id));
  if (!missing.length) return [];
  const rows: CultivarReferenceCollectionItem[] = [];
  for (let offset = 0; offset < missing.length; offset += 200) {
    rows.push(
      ...(await getTrpcClient().dashboardDb.cultivarReference.getByIds.query({
        ids: missing.slice(offset, offset + 200),
      })),
    );
    current.assertActive();
  }
  await current.references.utils.writeUpsert(rows);
  return rows;
}

export async function insertList(draft: Input["list"]["create"]) {
  const current = session;
  current.assertActive();
  const created = await getTrpcClient().dashboardDb.list.create.mutate(draft);
  current.assertActive();
  await current.lists.utils.writeUpsert(created);
  return created;
}
export function updateList(draft: Input["list"]["update"]) {
  const { lists } = session;
  return mutate(
    () =>
      lists.update(draft.id, (row) => {
        Object.assign(row, omitUndefined(draft.data));
      }),
    () => getTrpcClient().dashboardDb.list.update.mutate(draft),
    (row) => lists.utils.writeUpsert(row),
  );
}
export function deleteList(draft: Input["list"]["delete"]) {
  const { lists } = session;
  return mutate(
    () => lists.delete(draft.id),
    () => getTrpcClient().dashboardDb.list.delete.mutate(draft),
    () => lists.utils.writeDelete(draft.id),
  );
}
export async function loadMissingList(id: string) {
  const current = session;
  const row = await getTrpcClient().dashboardDb.list.get.query({ id });
  current.assertActive();
  await current.lists.utils.writeUpsert(row);
}
export function addListingToList(draft: Input["list"]["addListingToList"]) {
  const { lists } = session;
  return mutate(
    () =>
      lists.update(draft.listId, (row) => {
        if (!row.listings.some((item) => item.id === draft.listingId))
          row.listings.push({ id: draft.listingId });
      }),
    () => getTrpcClient().dashboardDb.list.addListingToList.mutate(draft),
    (row) => lists.utils.writeUpsert(row),
  );
}
export function removeListingFromList(
  draft: Input["list"]["removeListingFromList"],
) {
  const { lists } = session;
  return mutate(
    () =>
      lists.update(draft.listId, (row) => {
        row.listings = row.listings.filter(
          (item) => item.id !== draft.listingId,
        );
      }),
    () => getTrpcClient().dashboardDb.list.removeListingFromList.mutate(draft),
    (row) => lists.utils.writeUpsert(row),
  );
}
export function removeListingsFromList(
  draft: Input["list"]["removeListingsFromList"],
) {
  const { lists } = session;
  return mutate(
    () =>
      lists.update(draft.listId, (row) => {
        row.listings = row.listings.filter(
          (item) => !draft.listingIds.includes(item.id),
        );
      }),
    () => getTrpcClient().dashboardDb.list.removeListingsFromList.mutate(draft),
    (row) => lists.utils.writeUpsert(row),
  );
}

export async function createImage(draft: Input["image"]["create"]) {
  const current = session;
  current.assertActive();
  const created = await getTrpcClient().dashboardDb.image.create.mutate(draft);
  current.assertActive();
  await current.images.utils.writeUpsert(created);
  return created;
}
export async function loadImageFromPrimary(draft: Input["image"]["get"]) {
  const current = session;
  const row = await getTrpcClient().dashboardDb.image.get.query(draft);
  current.assertActive();
  await current.images.utils.writeUpsert(row);
  return row;
}
export function reorderImages(draft: Input["image"]["reorder"]) {
  const { images } = session;
  return mutate(
    () => {
      for (const image of draft.images)
        images.update(image.id, (row) => {
          row.order = image.order;
        });
    },
    () => getTrpcClient().dashboardDb.image.reorder.mutate(draft),
    () =>
      images.utils.writeUpdate(
        draft.images.map((image, order) => ({ id: image.id, order })),
      ),
  );
}
export function deleteImage(draft: Input["image"]["delete"]) {
  const { images } = session;
  return mutate(
    () => images.delete(draft.imageId),
    () => getTrpcClient().dashboardDb.image.delete.mutate(draft),
    () => images.utils.writeDelete(draft.imageId),
  );
}

export async function refreshDashboardDbFromServer(userId: string) {
  if (session.userId !== userId) return false;
  await session.refresh();
  return true;
}
export async function revalidateDashboardDbInBackground(userId: string) {
  await refreshDashboardDbFromServer(userId);
}
