"use client";

import type { RouterOutputs } from "@/trpc/react";
import { getQueryClient } from "@/trpc/query-client";
import {
  cursorKey,
  getCurrentUserId,
  setCurrentUserId,
} from "@/lib/utils/cursor";
import { writeCursorFromRows } from "@/app/dashboard/_lib/dashboard-db/collection-bootstrap";
import { listingsCollection } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { listsCollection } from "@/app/dashboard/_lib/dashboard-db/lists-collection";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import { cultivarReferencesCollection } from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";

const LISTINGS_CURSOR_BASE = "dashboard-db:listings:maxUpdatedAt";
const LISTS_CURSOR_BASE = "dashboard-db:lists:maxUpdatedAt";
const IMAGES_CURSOR_BASE = "dashboard-db:images:maxUpdatedAt";
const CULTIVAR_REFS_CURSOR_BASE = "dashboard-db:cultivar-references:maxUpdatedAt";

const LISTINGS_QUERY_KEY = ["dashboard-db", "listings"] as const;
const LISTS_QUERY_KEY = ["dashboard-db", "lists"] as const;
const IMAGES_QUERY_KEY = ["dashboard-db", "images"] as const;
const CULTIVAR_REFS_QUERY_KEY = ["dashboard-db", "cultivar-references"] as const;

type ListingRow = RouterOutputs["dashboardDb"]["listing"]["list"][number];
type ListRow = RouterOutputs["dashboardDb"]["list"]["list"][number];
type ImageRow = RouterOutputs["dashboardDb"]["image"]["list"][number];
type CultivarReferenceRow =
  RouterOutputs["dashboardDb"]["cultivarReference"]["listForUserListings"][number];

export const DASHBOARD_DB_PERSISTED_SWR = {
  enabled: true,
  ttlMs: 24 * 60 * 60 * 1000, // 1 day
  version: 1,
} as const;

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

async function idbGet<T>(key: IDBValidKey): Promise<T | null> {
  if (!isIdbSupported()) return null;

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readonly");
    const store = tx.objectStore(IDB_STORE_NAME);
    const request = store.get(key);

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

export async function writeDashboardDbSnapshot(snapshot: DashboardDbPersistedSnapshot) {
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
    queryClient.setQueryData(CULTIVAR_REFS_QUERY_KEY, snapshot.cultivarReferences);

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

    await Promise.all([
      listingsCollection.preload(),
      listsCollection.preload(),
      imagesCollection.preload(),
      cultivarReferencesCollection.preload(),
    ]);
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

export async function revalidateDashboardDbInBackground(userId: string) {
  if (!DASHBOARD_DB_PERSISTED_SWR.enabled) return;

  try {
    await Promise.all([
      listingsCollection.utils.refetch(),
      listsCollection.utils.refetch(),
      imagesCollection.utils.refetch(),
      cultivarReferencesCollection.utils.refetch(),
    ]);
  } catch {
    // ignore: background revalidate is best-effort
  }

  await persistDashboardDbToPersistence(userId);
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
