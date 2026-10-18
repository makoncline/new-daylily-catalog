"use client";

import { createCollection, type Collection } from "@tanstack/react-db";
import {
  MutationObserver,
  QueryClient,
  type QueryFunctionContext,
} from "@tanstack/react-query";
import {
  queryCollectionOptions,
  DeleteOperationItemNotFoundError,
  type QueryCollectionUtils,
} from "@tanstack/query-db-collection";
import {
  persistQueryClient,
  type PersistedClient,
} from "@tanstack/query-persist-client-core";
import { get, set, del } from "idb-keyval";
import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import { createMemberClient } from "@/trpc/client";
import { capturePosthogEvent } from "@/lib/analytics/posthog";

type Catalog = RouterOutputs["dashboardV2"]["bootstrap"]["catalog"];
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
type Input = RouterInputs["dashboardV2"];

let session: ReturnType<typeof createSession> | undefined;

function createSession(userId: string) {
  let active = true;
  const client = createMemberClient(userId);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: Infinity,
      },
    },
  });
  const storageKey = `dashboard-tanstack:${userId}`;
  const [stopPersisting, restored] = persistQueryClient({
    queryClient,
    maxAge: Infinity,
    buster: "1",
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.queryKey[0] === "dashboard-tanstack" &&
        query.state.data !== undefined,
      shouldDehydrateMutation: () => false,
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
    return client.dashboardV2.bootstrap.catalog.query(undefined, {
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
  // Query owns ordering. Commands keep their original client through awaits.
  function command<T>(
    request: () => Promise<T>,
    apply: (result: T) => Promise<unknown>,
  ) {
    return new MutationObserver<T>(queryClient, {
      scope: { id: "dashboard-commands" },
      networkMode: "always",
      retry: false,
      mutationFn: async () => {
        assertActive();
        const result = await request();
        assertActive();
        await apply(result);
        return result;
      },
    }).mutate();
  }

  async function cacheReferences(ids: string[]) {
    const missing = [...new Set(ids)].filter((id) => !references.has(id));
    for (let offset = 0; offset < missing.length; offset += 200) {
      const rows = await client.dashboardV2.cultivarReference.getByIds.query({
        ids: missing.slice(offset, offset + 200),
      });
      assertActive();
      await references.utils.writeUpsert(rows);
    }
  }
  async function cacheListings(rows: ListingCollectionItem[]) {
    await listings.utils.writeUpsert(rows);
    await cacheReferences(
      rows.flatMap((row) =>
        row.cultivarReferenceId ? [row.cultivarReferenceId] : [],
      ),
    ).catch(() => {
      // Reference metadata must not reject a confirmed listing save.
      console.warn("Could not load cultivar reference details");
    });
  }

  return {
    userId,
    client,
    listingsCollection: listings,
    listsCollection: lists,
    imagesCollection: images,
    cultivarReferencesCollection: references,
    restored,
    queryClient,
    queryOptions: { queryKey, queryFn },
    refreshDashboardCatalog: async () => {
      assertActive();
      await queryClient.cancelQueries({ queryKey });
      await listings.utils.refetch({ throwOnError: true });
    },
    dispose: async () => {
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
    insertListing: (draft: Input["listing"]["create"]) =>
      command(
        () => client.dashboardV2.listing.create.mutate(draft),
        async (row) => {
          const first = listings.size === 0;
          await cacheListings([row]);
          if (first)
            capturePosthogEvent("first_listing_created", {
              listingId: row.id,
              cultivarLinked: Boolean(draft.cultivarReferenceId),
            });
        },
      ),
    updateListing: (draft: Input["listing"]["update"]) =>
      command(
        () => client.dashboardV2.listing.update.mutate(draft),
        (row) => listings.utils.writeUpsert(row),
      ),
    deleteListing: (draft: Input["listing"]["delete"]) =>
      command(
        () => client.dashboardV2.listing.delete.mutate(draft),
        async (result) => {
          await deleteConfirmed(listings, [draft.id]);
          await deleteConfirmed(
            images,
            [...images.values()]
              .filter((row) => row.listingId === draft.id)
              .map((row) => row.id),
          );
          if (result.lists.length) await lists.utils.writeUpsert(result.lists);
        },
      ),
    loadMissingListing: (id: string) =>
      command(
        () => client.dashboardV2.listing.get.query({ id }),
        (row) => cacheListings([row]),
      ),
    loadListingsByIds: (ids: string[]) =>
      command(
        () => client.dashboardV2.listing.getByIds.query({ ids }),
        cacheListings,
      ),
    linkAhs: (draft: Input["listing"]["linkAhs"]) =>
      command(
        () => client.dashboardV2.listing.linkAhs.mutate(draft),
        (row) => cacheListings([row]),
      ),
    unlinkAhs: (draft: Input["listing"]["unlinkAhs"]) =>
      command(
        () => client.dashboardV2.listing.unlinkAhs.mutate(draft),
        (row) => listings.utils.writeUpsert(row),
      ),
    syncAhsName: (draft: Input["listing"]["syncAhsName"]) =>
      command(
        () => client.dashboardV2.listing.syncAhsName.mutate(draft),
        (row) => listings.utils.writeUpsert(row),
      ),
    insertList: (draft: Input["list"]["create"]) =>
      command(
        () => client.dashboardV2.list.create.mutate(draft),
        (row) => lists.utils.writeUpsert(row),
      ),
    updateList: (draft: Input["list"]["update"]) =>
      command(
        () => client.dashboardV2.list.update.mutate(draft),
        (row) => lists.utils.writeUpsert(row),
      ),
    deleteList: (draft: Input["list"]["delete"]) =>
      command(
        () => client.dashboardV2.list.delete.mutate(draft),
        () => deleteConfirmed(lists, [draft.id]),
      ),
    loadMissingList: (id: string) =>
      command(
        () => client.dashboardV2.list.get.query({ id }),
        (row) => lists.utils.writeUpsert(row),
      ),
    addListingToList: (draft: Input["list"]["addListingToList"]) =>
      command(
        () => client.dashboardV2.list.addListingToList.mutate(draft),
        (row) => lists.utils.writeUpsert(row),
      ),
    removeListingFromList: (draft: Input["list"]["removeListingFromList"]) =>
      command(
        () => client.dashboardV2.list.removeListingFromList.mutate(draft),
        (row) => lists.utils.writeUpsert(row),
      ),
    removeListingsFromList: (draft: Input["list"]["removeListingsFromList"]) =>
      command(
        () => client.dashboardV2.list.removeListingsFromList.mutate(draft),
        (row) => lists.utils.writeUpsert(row),
      ),
    createImage: (draft: Input["image"]["create"]) =>
      command(
        () => client.dashboardV2.image.create.mutate(draft),
        (row) => images.utils.writeUpsert(row),
      ),
    loadImageFromPrimary: (draft: Input["image"]["get"]) =>
      command(
        () => client.dashboardV2.image.get.query(draft),
        (row) => images.utils.writeUpsert(row),
      ),
    reorderImages: (draft: Input["image"]["reorder"]) =>
      command(
        () => client.dashboardV2.image.reorder.mutate(draft),
        (result) => images.utils.writeUpsert(result.images),
      ),
    deleteImage: (draft: Input["image"]["delete"]) =>
      command(
        () => client.dashboardV2.image.delete.mutate(draft),
        () => deleteConfirmed(images, [draft.imageId]),
      ),
  };
}

async function deleteConfirmed<T extends { id: string }>(
  collection: NativeCollection<T>,
  ids: string[],
) {
  for (const id of ids) {
    try {
      await collection.utils.writeDelete(id);
    } catch (error) {
      // A refresh may have already applied the confirmed server deletion.
      if (!(error instanceof DeleteOperationItemNotFoundError)) throw error;
    }
  }
}

// Route suspension can restart effects. Reuse this member's catalog; callers
// retain the returned session, so an account change cannot redirect their work.
export function createDashboard(userId: string) {
  if (session?.userId === userId) return session;
  if (session) void session.dispose();
  session = createSession(userId);
  return session;
}
