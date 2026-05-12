"use client";

import type { RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import { cursorKey, getCurrentUserId } from "@/lib/utils/cursor";
import {
  logDashboardSyncTiming,
  writeCursorFromRows,
} from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";
import {
  clearNextListingsCollectionSyncSuppression,
  listingsCollection,
  suppressNextListingsCollectionSync,
} from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import {
  clearNextListsCollectionSyncSuppression,
  listsCollection,
  suppressNextListsCollectionSync,
} from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import {
  clearNextImagesCollectionSyncSuppression,
  imagesCollection,
  suppressNextImagesCollectionSync,
} from "@/app/dashboard/_lib/dashboard-db/images-collection";
import {
  clearNextCultivarReferencesCollectionSyncSuppression,
  cultivarReferencesCollection,
  suppressNextCultivarReferencesCollectionSync,
} from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";

let dashboardDbRefreshQueue: Promise<void> = Promise.resolve();
let dashboardDbRefreshGeneration = 0;

const LISTINGS_CURSOR_BASE = "dashboard-db:listings:maxUpdatedAt";
const LISTS_CURSOR_BASE = "dashboard-db:lists:maxUpdatedAt";
const IMAGES_CURSOR_BASE = "dashboard-db:images:maxUpdatedAt";
const CULTIVAR_REFS_CURSOR_BASE =
  "dashboard-db:cultivar-references:maxUpdatedAt";

const LISTINGS_QUERY_KEY = ["dashboard-db", "listings"] as const;
const LISTS_QUERY_KEY = ["dashboard-db", "lists"] as const;
const IMAGES_QUERY_KEY = ["dashboard-db", "images"] as const;
const CULTIVAR_REFS_QUERY_KEY = [
  "dashboard-db",
  "cultivar-references",
] as const;
const IMAGE_LISTING_ID_CHUNK_SIZE = 900;
const CULTIVAR_REF_ID_CHUNK_SIZE = 300;
const DASHBOARD_BOOTSTRAP_CHUNK_CONCURRENCY = 2;
const SQLITE_CACHE_WRITTEN_AT_BASE = "dashboard-db:sqlite-cache-written-at";
const DASHBOARD_DB_SQLITE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type ListingRow = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type ListRow = RouterOutputs["dashboardDb"]["list"]["list"][number];
type ImageRow = RouterOutputs["dashboardDb"]["image"]["list"][number];
type CultivarReferenceRow =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];
interface DashboardDbServerSnapshot {
  listings: ListingRow[];
  lists: ListRow[];
  images: ImageRow[];
  cultivarReferences: CultivarReferenceRow[];
}

interface DashboardDbRefreshGuard {
  isActive?: () => boolean;
}

type DashboardDbSnapshotSource = "primary" | "replica";

interface DashboardCollectionPreloader {
  preload: () => Promise<void>;
  values: () => Iterable<unknown>;
}

export class DashboardRefreshLockCancelledError extends Error {
  constructor() {
    super("Dashboard refresh work was cancelled");
    this.name = "DashboardRefreshLockCancelledError";
  }
}

function isDashboardRefreshLockCancelledError(error: unknown) {
  return error instanceof DashboardRefreshLockCancelledError;
}

function markDashboardDbSqliteCacheWritten(userId: string) {
  localStorage.setItem(
    cursorKey(SQLITE_CACHE_WRITTEN_AT_BASE, userId),
    new Date().toISOString(),
  );
}

export function hasFreshDashboardDbSqliteCache(userId: string) {
  const value = localStorage.getItem(
    cursorKey(SQLITE_CACHE_WRITTEN_AT_BASE, userId),
  );
  if (!value) return false;

  const writtenAtMs = new Date(value).getTime();
  if (Number.isNaN(writtenAtMs)) return false;

  return Date.now() - writtenAtMs < DASHBOARD_DB_SQLITE_CACHE_TTL_MS;
}

function writeCursorFromSnapshotRows(args: {
  cursorBase: string;
  userId: string;
  rows: readonly { updatedAt: Date }[];
}) {
  const storageKey = cursorKey(args.cursorBase, args.userId);
  if (args.rows.length === 0) {
    localStorage.removeItem(storageKey);
    return;
  }

  writeCursorFromRows({
    cursorStorageKey: storageKey,
    rows: args.rows,
  });
}

function suppressNextDashboardCollectionSyncs() {
  suppressNextListingsCollectionSync();
  suppressNextListsCollectionSync();
  suppressNextImagesCollectionSync();
  suppressNextCultivarReferencesCollectionSync();
}

function clearDashboardCollectionCursors(userId: string) {
  localStorage.removeItem(cursorKey(LISTINGS_CURSOR_BASE, userId));
  localStorage.removeItem(cursorKey(LISTS_CURSOR_BASE, userId));
  localStorage.removeItem(cursorKey(IMAGES_CURSOR_BASE, userId));
  localStorage.removeItem(cursorKey(CULTIVAR_REFS_CURSOR_BASE, userId));
}

function clearNextDashboardCollectionSyncSuppressions() {
  clearNextListingsCollectionSyncSuppression();
  clearNextListsCollectionSyncSuppression();
  clearNextImagesCollectionSyncSuppression();
  clearNextCultivarReferencesCollectionSyncSuppression();
}

function chunkArray<T>(rows: readonly T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

async function mapWithConcurrency<T, R>(
  rows: readonly T[],
  concurrency: number,
  mapper: (row: T, index: number) => Promise<R>,
) {
  const results: R[] = new Array<R>(rows.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
      while (nextIndex < rows.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(rows[index]!, index);
      }
    }),
  );

  return results;
}

async function fetchImagesForListings(
  listings: readonly ListingRow[],
  source: DashboardDbSnapshotSource,
) {
  const client = getTrpcClient();
  const listingIdChunks = chunkArray(
    listings.map((listing) => listing.id),
    IMAGE_LISTING_ID_CHUNK_SIZE,
  );
  if (!listingIdChunks.length) return [];

  const imageChunks = await mapWithConcurrency(
    listingIdChunks,
    DASHBOARD_BOOTSTRAP_CHUNK_CONCURRENCY,
    (listingIds) => {
      const input = { listingIds };
      return source === "replica"
        ? client.dashboardDb.image.listByListingIdsReplica.mutate(input)
        : client.dashboardDb.image.listByListingIds.mutate(input);
    },
  );

  return sortSnapshotImages(imageChunks.flat());
}

async function fetchCultivarReferencesForListings(
  listings: readonly ListingRow[],
  source: DashboardDbSnapshotSource,
) {
  const client = getTrpcClient();
  const cultivarReferenceIds = Array.from(
    new Set(
      listings.flatMap((listing) =>
        listing.cultivarReferenceId ? [listing.cultivarReferenceId] : [],
      ),
    ),
  );
  const cultivarReferenceChunks = await mapWithConcurrency(
    chunkArray(cultivarReferenceIds, CULTIVAR_REF_ID_CHUNK_SIZE),
    DASHBOARD_BOOTSTRAP_CHUNK_CONCURRENCY,
    (ids) => {
      const input = { ids };
      return source === "replica"
        ? client.dashboardDb.cultivarReference.getByIdsBatchReplica.mutate(
            input,
          )
        : client.dashboardDb.cultivarReference.getByIdsBatch.mutate(input);
    },
  );

  return sortSnapshotCultivarReferences(cultivarReferenceChunks.flat());
}

function sortSnapshotImages(rows: readonly ImageRow[]) {
  return [...rows].sort(
    (a, b) =>
      (a.listingId ?? "").localeCompare(b.listingId ?? "") ||
      (a.userProfileId ?? "").localeCompare(b.userProfileId ?? "") ||
      a.order - b.order ||
      a.id.localeCompare(b.id),
  );
}

function sortSnapshotCultivarReferences(rows: readonly CultivarReferenceRow[]) {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

function sortSnapshotListings(rows: readonly ListingRow[]) {
  return [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function sortSnapshotLists(rows: readonly ListRow[]) {
  return [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function applyDashboardDbSnapshot(
  userId: string,
  snapshot: DashboardDbServerSnapshot,
  options: {
    label?: string;
    markCacheWritten?: boolean;
    preloadCollections?: boolean;
  } = {},
) {
  const startedAt = performance.now();
  const queryClient = getQueryClient();

  const queryDataStartedAt = performance.now();
  queryClient.setQueryData(LISTINGS_QUERY_KEY, snapshot.listings);
  queryClient.setQueryData(LISTS_QUERY_KEY, snapshot.lists);
  queryClient.setQueryData(IMAGES_QUERY_KEY, snapshot.images);
  queryClient.setQueryData(
    CULTIVAR_REFS_QUERY_KEY,
    snapshot.cultivarReferences,
  );
  const queryDataDurationMs = performance.now() - queryDataStartedAt;

  const cursorStartedAt = performance.now();
  writeCursorFromSnapshotRows({
    cursorBase: LISTINGS_CURSOR_BASE,
    userId,
    rows: snapshot.listings,
  });
  writeCursorFromSnapshotRows({
    cursorBase: LISTS_CURSOR_BASE,
    userId,
    rows: snapshot.lists,
  });
  writeCursorFromSnapshotRows({
    cursorBase: IMAGES_CURSOR_BASE,
    userId,
    rows: snapshot.images,
  });
  writeCursorFromSnapshotRows({
    cursorBase: CULTIVAR_REFS_CURSOR_BASE,
    userId,
    rows: snapshot.cultivarReferences,
  });
  const cursorDurationMs = performance.now() - cursorStartedAt;

  suppressNextDashboardCollectionSyncs();
  let preloadDurationMs: number | null = null;
  if (options.preloadCollections !== false) {
    const preloadStartedAt = performance.now();
    await Promise.all([
      listingsCollection.preload(),
      listsCollection.preload(),
      imagesCollection.preload(),
      cultivarReferencesCollection.preload(),
    ]);
    preloadDurationMs = performance.now() - preloadStartedAt;
  }

  if (options.markCacheWritten !== false) {
    markDashboardDbSqliteCacheWritten(userId);
  }

  logDashboardSyncTiming(options.label ?? "snapshot.apply", startedAt, {
    listings: snapshot.listings.length,
    lists: snapshot.lists.length,
    images: snapshot.images.length,
    cultivarReferences: snapshot.cultivarReferences.length,
    queryDataDurationMs: Number(queryDataDurationMs.toFixed(1)),
    cursorDurationMs: Number(cursorDurationMs.toFixed(1)),
    preloadDurationMs:
      preloadDurationMs === null ? null : Number(preloadDurationMs.toFixed(1)),
  });
}

export async function hydrateDashboardDbFromSqlitePersistence(args: {
  userId: string;
}) {
  const startedAt = performance.now();
  const hydrateCollection = async <TRow>(
    collection: DashboardCollectionPreloader,
  ) => {
    const preloadStartedAt = performance.now();
    await collection.preload();
    const preloadDurationMs = performance.now() - preloadStartedAt;
    const rows = Array.from(collection.values()) as TRow[];

    return {
      preloadDurationMs,
      rows,
    };
  };

  suppressNextDashboardCollectionSyncs();

  const [listings, lists, images, cultivarReferences] = await Promise.all([
    hydrateCollection<ListingRow>(listingsCollection),
    hydrateCollection<ListRow>(listsCollection),
    hydrateCollection<ImageRow>(imagesCollection),
    hydrateCollection<CultivarReferenceRow>(cultivarReferencesCollection),
  ]);

  const queryDataStartedAt = performance.now();
  const queryClient = getQueryClient();
  queryClient.setQueryData(
    LISTINGS_QUERY_KEY,
    sortSnapshotListings(listings.rows),
  );
  queryClient.setQueryData(LISTS_QUERY_KEY, sortSnapshotLists(lists.rows));
  queryClient.setQueryData(IMAGES_QUERY_KEY, sortSnapshotImages(images.rows));
  queryClient.setQueryData(
    CULTIVAR_REFS_QUERY_KEY,
    sortSnapshotCultivarReferences(cultivarReferences.rows),
  );
  const queryDataDurationMs = performance.now() - queryDataStartedAt;

  logDashboardSyncTiming("sqlite.hydrate.snapshot", startedAt, {
    userId: args.userId,
    listings: listings.rows.length,
    lists: lists.rows.length,
    images: images.rows.length,
    cultivarReferences: cultivarReferences.rows.length,
    listingsPreloadDurationMs: Number(listings.preloadDurationMs.toFixed(1)),
    listsPreloadDurationMs: Number(lists.preloadDurationMs.toFixed(1)),
    imagesPreloadDurationMs: Number(images.preloadDurationMs.toFixed(1)),
    cultivarReferencesPreloadDurationMs: Number(
      cultivarReferences.preloadDurationMs.toFixed(1),
    ),
    queryDataDurationMs: Number(queryDataDurationMs.toFixed(1)),
  });
}

async function fetchDashboardDbSnapshotFromSource(
  source: DashboardDbSnapshotSource,
) {
  const startedAt = performance.now();
  const client = getTrpcClient();
  const rootsStartedAt = performance.now();
  const { listings, lists, profileImages } =
    source === "replica"
      ? await client.dashboardDb.bootstrap.replicaRoots.query()
      : await client.dashboardDb.bootstrap.roots.query();
  const rootsDurationMs = performance.now() - rootsStartedAt;
  const imagesStartedAt = performance.now();
  const images = await fetchImagesForListings(listings, source);
  const imagesDurationMs = performance.now() - imagesStartedAt;
  const cultivarReferencesStartedAt = performance.now();
  const cultivarReferences = await fetchCultivarReferencesForListings(
    listings,
    source,
  );
  const cultivarReferencesDurationMs =
    performance.now() - cultivarReferencesStartedAt;

  logDashboardSyncTiming(`${source}.bootstrap.snapshot`, startedAt, {
    listings: listings.length,
    lists: lists.length,
    images: profileImages.length + images.length,
    cultivarReferences: cultivarReferences.length,
    rootsDurationMs: Number(rootsDurationMs.toFixed(1)),
    imagesDurationMs: Number(imagesDurationMs.toFixed(1)),
    cultivarReferencesDurationMs: Number(
      cultivarReferencesDurationMs.toFixed(1),
    ),
    imageChunks: Math.ceil(listings.length / IMAGE_LISTING_ID_CHUNK_SIZE),
    cultivarReferenceChunks: Math.ceil(
      new Set(
        listings.flatMap((listing) =>
          listing.cultivarReferenceId ? [listing.cultivarReferenceId] : [],
        ),
      ).size / CULTIVAR_REF_ID_CHUNK_SIZE,
    ),
  });

  return {
    listings,
    lists,
    images: sortSnapshotImages([...profileImages, ...images]),
    cultivarReferences,
  };
}

export async function fetchDashboardDbSnapshotFromServer() {
  return fetchDashboardDbSnapshotFromSource("primary");
}

export async function fetchDashboardDbSnapshotFromReplica() {
  return fetchDashboardDbSnapshotFromSource("replica");
}

export async function isDashboardDbReplicaAvailable() {
  return getTrpcClient().dashboardDb.bootstrap.replicaAvailable.query();
}

async function invalidateDashboardCollectionQueries() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: LISTINGS_QUERY_KEY,
      refetchType: "none",
    }),
    queryClient.invalidateQueries({
      queryKey: LISTS_QUERY_KEY,
      refetchType: "none",
    }),
    queryClient.invalidateQueries({
      queryKey: IMAGES_QUERY_KEY,
      refetchType: "none",
    }),
    queryClient.invalidateQueries({
      queryKey: CULTIVAR_REFS_QUERY_KEY,
      refetchType: "none",
    }),
  ]);
}

export function resetDashboardRefreshLock() {
  dashboardDbRefreshGeneration += 1;
  dashboardDbRefreshQueue = Promise.resolve();
}

export function runWithDashboardRefreshLock<T>(work: () => Promise<T>) {
  const generation = dashboardDbRefreshGeneration;
  const previous = dashboardDbRefreshQueue.catch(() => undefined);

  let release!: () => void;
  dashboardDbRefreshQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  return previous
    .then(async () => {
      if (generation !== dashboardDbRefreshGeneration) {
        throw new DashboardRefreshLockCancelledError();
      }

      return await work();
    })
    .finally(() => {
      release();
    });
}

export async function bootstrapDashboardDbFromServer(
  userId: string,
  guard?: DashboardDbRefreshGuard,
) {
  try {
    await runWithDashboardRefreshLock(async () => {
      if (guard?.isActive && !guard.isActive()) {
        return;
      }

      if (getCurrentUserId() !== userId) {
        return;
      }

      const snapshot = await fetchDashboardDbSnapshotFromServer();

      if (guard?.isActive && !guard.isActive()) {
        return;
      }

      if (getCurrentUserId() !== userId) {
        return;
      }

      await applyDashboardDbSnapshot(userId, snapshot, {
        label: "primary.bootstrap.apply",
      });
    });
  } catch (error) {
    if (isDashboardRefreshLockCancelledError(error)) {
      return;
    }

    throw error;
  }
}

export async function bootstrapDashboardDbFromReplica(
  userId: string,
  guard?: DashboardDbRefreshGuard,
) {
  if (!(await isDashboardDbReplicaAvailable())) {
    return false;
  }

  try {
    await runWithDashboardRefreshLock(async () => {
      if (guard?.isActive && !guard.isActive()) {
        return;
      }

      if (getCurrentUserId() !== userId) {
        return;
      }

      const snapshot = await fetchDashboardDbSnapshotFromReplica();

      if (guard?.isActive && !guard.isActive()) {
        return;
      }

      if (getCurrentUserId() !== userId) {
        return;
      }

      await applyDashboardDbSnapshot(userId, snapshot, {
        label: "replica.bootstrap.apply",
        markCacheWritten: false,
      });
    });
    return true;
  } catch (error) {
    if (isDashboardRefreshLockCancelledError(error)) {
      return false;
    }

    throw error;
  }
}

export async function refreshDashboardDbFromServer(
  userId: string,
  guard?: DashboardDbRefreshGuard,
) {
  try {
    return await runWithDashboardRefreshLock(async () => {
      if (guard?.isActive && !guard.isActive()) {
        return false;
      }

      if (getCurrentUserId() !== userId) {
        return false;
      }

      const snapshot = await fetchDashboardDbSnapshotFromServer();

      if (guard?.isActive && !guard.isActive()) {
        return false;
      }

      if (getCurrentUserId() !== userId) {
        return false;
      }

      await applyDashboardDbSnapshot(userId, snapshot, {
        label: "primary.refresh.apply",
      });
      return true;
    });
  } catch (error) {
    if (isDashboardRefreshLockCancelledError(error)) {
      return false;
    }

    throw error;
  }
}

export async function revalidateDashboardDbInBackground(
  userId: string,
  guard?: DashboardDbRefreshGuard,
) {
  try {
    const refreshed = await refreshDashboardDbFromServer(userId, guard);
    if (!refreshed) {
      clearNextDashboardCollectionSyncSuppressions();
      clearDashboardCollectionCursors(userId);
      await invalidateDashboardCollectionQueries();
    }
  } catch {
    clearNextDashboardCollectionSyncSuppressions();
    clearDashboardCollectionCursors(userId);
    await invalidateDashboardCollectionQueries();
    // ignore: background revalidate is best-effort
  }
}
