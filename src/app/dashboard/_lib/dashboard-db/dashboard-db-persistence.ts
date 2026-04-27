"use client";

import type { RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";
import {
  cursorKey,
  getCurrentUserId,
  setCurrentUserId,
} from "@/lib/utils/cursor";
import {
  fetchDashboardSyncPages,
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
const IMAGE_OWNER_REF_CHUNK_SIZE = 250;
const CULTIVAR_REF_ID_CHUNK_SIZE = 50;

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

export const DASHBOARD_DB_PERSISTED_SWR = {
  enabled: true,
  ttlMs: 24 * 60 * 60 * 1000, // 1 day
  version: 5,
} as const;

interface DashboardDbRefreshGuard {
  isActive?: () => boolean;
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

export interface DashboardDbPersistedSnapshot {
  userId: string;
  version: number;
  persistedAt: Date;
  listings: ListingRow[];
  lists: ListRow[];
  images: ImageRow[];
  cultivarReferences: CultivarReferenceRow[];
}

const IDB_DB_NAME = "new-daylily-catalog";
const IDB_STORE_NAME = "dashboard-db-snapshots";
const IDB_VERSION = 1;

function isIdbSupported() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: "userId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      const err = request.error;
      reject(err instanceof Error ? err : new Error("IndexedDB open failed"));
    };
  });
}

function closeDbOnTransactionComplete(tx: IDBTransaction, db: IDBDatabase) {
  const closeDb = () => {
    db.close();
  };

  tx.oncomplete = closeDb;
  tx.onerror = closeDb;
  tx.onabort = closeDb;
}

async function idbGet<T>(key: IDBValidKey): Promise<T | null> {
  if (!isIdbSupported()) return null;

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readonly");
    const store = tx.objectStore(IDB_STORE_NAME);
    const request = store.get(key);
    closeDbOnTransactionComplete(tx, db);

    request.onsuccess = () => {
      resolve((request.result as T | undefined) ?? null);
    };
    request.onerror = () => {
      const err = request.error;
      reject(err instanceof Error ? err : new Error("IndexedDB get failed"));
    };
  });
}

async function idbPut<T extends { userId: string }>(value: T): Promise<void> {
  if (!isIdbSupported()) return;

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    const request = store.put(value);
    closeDbOnTransactionComplete(tx, db);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      const err = request.error;
      reject(err instanceof Error ? err : new Error("IndexedDB put failed"));
    };
  });
}

async function idbDelete(key: IDBValidKey): Promise<void> {
  if (!isIdbSupported()) return;

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    const store = tx.objectStore(IDB_STORE_NAME);
    const request = store.delete(key);
    closeDbOnTransactionComplete(tx, db);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      const err = request.error;
      reject(err instanceof Error ? err : new Error("IndexedDB delete failed"));
    };
  });
}

export async function readDashboardDbSnapshot(userId: string) {
  const snapshot = await idbGet<DashboardDbPersistedSnapshot>(userId);
  return snapshot ?? null;
}

export async function writeDashboardDbSnapshot(
  snapshot: DashboardDbPersistedSnapshot,
) {
  await idbPut(snapshot);
}

export async function deleteDashboardDbSnapshot(userId: string) {
  await idbDelete(userId);
}

function getPersistedAtMs(snapshot: DashboardDbPersistedSnapshot) {
  const value = snapshot.persistedAt as unknown;
  if (value instanceof Date) return value.getTime();

  if (typeof value === "string" || typeof value === "number") {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  return null;
}

function isSnapshotFresh(snapshot: DashboardDbPersistedSnapshot) {
  const persistedAtMs = getPersistedAtMs(snapshot);
  if (persistedAtMs === null) return false;

  return (
    snapshot.version === DASHBOARD_DB_PERSISTED_SWR.version &&
    Date.now() - persistedAtMs < DASHBOARD_DB_PERSISTED_SWR.ttlMs
  );
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

function clearDashboardCollectionCursors(userId: string) {
  localStorage.removeItem(cursorKey(LISTINGS_CURSOR_BASE, userId));
  localStorage.removeItem(cursorKey(LISTS_CURSOR_BASE, userId));
  localStorage.removeItem(cursorKey(IMAGES_CURSOR_BASE, userId));
  localStorage.removeItem(cursorKey(CULTIVAR_REFS_CURSOR_BASE, userId));
}

function suppressNextDashboardCollectionSyncs() {
  suppressNextListingsCollectionSync();
  suppressNextListsCollectionSync();
  suppressNextImagesCollectionSync();
  suppressNextCultivarReferencesCollectionSync();
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

async function fetchImagesForListings(listings: readonly ListingRow[]) {
  const client = getTrpcClient();
  const listingIdChunks = chunkArray(
    listings.map((listing) => listing.id),
    IMAGE_OWNER_REF_CHUNK_SIZE,
  );
  const chunks = listingIdChunks.length ? listingIdChunks : [[]];
  const images: ImageRow[] = [];

  for (let i = 0; i < chunks.length; i++) {
    images.push(
      ...(await client.dashboardDb.image.listByOwnerRefs.mutate({
        listingIds: chunks[i]!,
        includeProfileImages: i === 0,
      })),
    );
  }

  return images;
}

async function fetchCultivarReferencesForListings(
  listings: readonly ListingRow[],
) {
  const client = getTrpcClient();
  const cultivarReferenceIds = Array.from(
    new Set(
      listings.flatMap((listing) =>
        listing.cultivarReferenceId ? [listing.cultivarReferenceId] : [],
      ),
    ),
  );
  const cultivarReferences: CultivarReferenceRow[] = [];

  for (const ids of chunkArray(cultivarReferenceIds, CULTIVAR_REF_ID_CHUNK_SIZE)) {
    cultivarReferences.push(
      ...(await client.dashboardDb.cultivarReference.getByIds.query({ ids })),
    );
  }

  return cultivarReferences;
}

async function applyDashboardDbSnapshot(
  userId: string,
  snapshot: DashboardDbServerSnapshot,
) {
  const queryClient = getQueryClient();

  queryClient.setQueryData(LISTINGS_QUERY_KEY, snapshot.listings);
  queryClient.setQueryData(LISTS_QUERY_KEY, snapshot.lists);
  queryClient.setQueryData(IMAGES_QUERY_KEY, snapshot.images);
  queryClient.setQueryData(
    CULTIVAR_REFS_QUERY_KEY,
    snapshot.cultivarReferences,
  );

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

  suppressNextDashboardCollectionSyncs();
  await Promise.all([
    listingsCollection.preload(),
    listsCollection.preload(),
    imagesCollection.preload(),
    cultivarReferencesCollection.preload(),
  ]);
}

async function fetchDashboardDbSnapshotFromServer() {
  const client = getTrpcClient();
  const listings = await fetchDashboardSyncPages({
    since: null,
    fetchPage: (input) => client.dashboardDb.listing.sync.query(input),
  });
  const lists = await fetchDashboardSyncPages({
    since: null,
    fetchPage: (input) => client.dashboardDb.list.sync.query(input),
  });
  const images = await fetchImagesForListings(listings);
  const cultivarReferences = await fetchCultivarReferencesForListings(listings);

  return {
    listings,
    lists,
    images,
    cultivarReferences,
  };
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

export async function tryHydrateDashboardDbFromPersistence(userId: string) {
  if (!DASHBOARD_DB_PERSISTED_SWR.enabled) return false;
  if (!isIdbSupported()) return false;

  let snapshot: DashboardDbPersistedSnapshot | null = null;
  try {
    snapshot = await readDashboardDbSnapshot(userId);
  } catch {
    return false;
  }

  if (!snapshot) return false;

  if (!isSnapshotFresh(snapshot)) {
    if (snapshot.version !== DASHBOARD_DB_PERSISTED_SWR.version) {
      try {
        await deleteDashboardDbSnapshot(userId);
      } catch {
        // ignore: best-effort cleanup
      }
    }
    return false;
  }

  try {
    setCurrentUserId(userId);

    const queryClient = getQueryClient();
    queryClient.setQueryData(LISTINGS_QUERY_KEY, snapshot.listings);
    queryClient.setQueryData(LISTS_QUERY_KEY, snapshot.lists);
    queryClient.setQueryData(IMAGES_QUERY_KEY, snapshot.images);
    queryClient.setQueryData(
      CULTIVAR_REFS_QUERY_KEY,
      snapshot.cultivarReferences,
    );

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

    suppressNextDashboardCollectionSyncs();
  } catch {
    return false;
  }

  return true;
}

export async function persistDashboardDbToPersistence(userId: string) {
  if (!DASHBOARD_DB_PERSISTED_SWR.enabled) return;
  if (!isIdbSupported()) return;

  try {
    const queryClient = getQueryClient();

    const listings =
      queryClient.getQueryData<ListingRow[]>(LISTINGS_QUERY_KEY) ?? [];
    const lists = queryClient.getQueryData<ListRow[]>(LISTS_QUERY_KEY) ?? [];
    const images = queryClient.getQueryData<ImageRow[]>(IMAGES_QUERY_KEY) ?? [];
    const cultivarReferences =
      queryClient.getQueryData<CultivarReferenceRow[]>(
        CULTIVAR_REFS_QUERY_KEY,
      ) ?? [];

    await writeDashboardDbSnapshot({
      userId,
      version: DASHBOARD_DB_PERSISTED_SWR.version,
      persistedAt: new Date(),
      listings,
      lists,
      images,
      cultivarReferences,
    });
  } catch {
    // ignore: best-effort optimization
  }
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

      await applyDashboardDbSnapshot(userId, snapshot);

      await persistDashboardDbToPersistence(userId);
    });
  } catch (error) {
    if (isDashboardRefreshLockCancelledError(error)) {
      return;
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

      await applyDashboardDbSnapshot(userId, snapshot);

      await persistDashboardDbToPersistence(userId);
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
  if (!DASHBOARD_DB_PERSISTED_SWR.enabled) return;

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

let persistTimeout: ReturnType<typeof setTimeout> | null = null;
let persistInFlight: Promise<void> | null = null;
let persistQueued = false;

function runPersist(userId: string) {
  if (persistInFlight) {
    persistQueued = true;
    return;
  }

  persistInFlight = persistDashboardDbToPersistence(userId)
    .catch(() => {
      // ignore persistence errors; this is an optimization
    })
    .finally(() => {
      persistInFlight = null;
      if (persistQueued) {
        persistQueued = false;
        runPersist(userId);
      }
    });
}

export function schedulePersistDashboardDbForCurrentUser(args?: {
  delayMs?: number;
}) {
  if (!DASHBOARD_DB_PERSISTED_SWR.enabled) return;
  if (!isIdbSupported()) return;

  const userId = getCurrentUserId();
  if (!userId) return;

  const delayMs = args?.delayMs ?? 750;

  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    persistTimeout = null;
    runPersist(userId);
  }, delayMs);
}
