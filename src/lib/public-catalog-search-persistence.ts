"use client";

import { type InfiniteData } from "@tanstack/react-query";
import { TIME } from "@/config/constants";
import { getTrpcClient } from "@/trpc/client";
import { type RouterOutputs } from "@/trpc/react";

type PublicCatalogListing = RouterOutputs["public"]["getListings"][number];
type PublicCatalogPageParam = string | null;
type PublicCatalogPersistedPageParam = string | null;

export type PublicCatalogInfiniteData = InfiniteData<
  PublicCatalogListing[],
  PublicCatalogPageParam
>;

export const PUBLIC_CATALOG_SEARCH_PERSISTED_SWR = {
  enabled: true,
  version: 1,
  ttlMs: 14 * 24 * 60 * 60 * 1000,
  revalidateAfterMs: TIME.DAY_IN_MS,
  queryLimit: 500,
  maxPagesToPrefetch: 2000,
} as const;

export interface PublicCatalogSearchPersistedSnapshot {
  userId: string;
  userSlugOrId: string;
  version: number;
  persistedAt: string;
  limit: number;
  data: {
    pages: PublicCatalogListing[][];
    pageParams: PublicCatalogPersistedPageParam[];
  };
}

const IDB_DB_NAME = "new-daylily-catalog-public-cache";
const IDB_STORE_NAME = "public-catalog-search-snapshots";
const IDB_VERSION = 1;

const prefetchInFlight = new Map<
  string,
  Promise<PublicCatalogSearchPersistedSnapshot | null>
>();

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

function normalizePageParamsForStorage(
  pageParams: readonly unknown[],
): PublicCatalogPersistedPageParam[] {
  return pageParams.map((param) => (typeof param === "string" ? param : null));
}

function restorePageParamsForRuntime(
  pageParams: readonly PublicCatalogPersistedPageParam[],
): PublicCatalogPageParam[] {
  return pageParams.map((param) => (typeof param === "string" ? param : null));
}

function getPersistedAtMs(snapshot: PublicCatalogSearchPersistedSnapshot) {
  const ms = new Date(snapshot.persistedAt).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function isPublicCatalogSearchSnapshotUsable(
  snapshot: PublicCatalogSearchPersistedSnapshot,
) {
  return (
    snapshot.version === PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.version &&
    snapshot.limit === PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.queryLimit &&
    Array.isArray(snapshot.data.pages) &&
    Array.isArray(snapshot.data.pageParams)
  );
}

export function isPublicCatalogSearchSnapshotFresh(
  snapshot: PublicCatalogSearchPersistedSnapshot,
) {
  if (!isPublicCatalogSearchSnapshotUsable(snapshot)) {
    return false;
  }

  const persistedAtMs = getPersistedAtMs(snapshot);
  if (persistedAtMs === null) {
    return false;
  }

  return Date.now() - persistedAtMs < PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.ttlMs;
}

export function shouldRevalidatePublicCatalogSearchSnapshot(
  snapshot: PublicCatalogSearchPersistedSnapshot,
) {
  if (!isPublicCatalogSearchSnapshotUsable(snapshot)) {
    return false;
  }

  const persistedAtMs = getPersistedAtMs(snapshot);
  if (persistedAtMs === null) {
    return true;
  }

  return (
    Date.now() - persistedAtMs >=
    PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.revalidateAfterMs
  );
}

export function createPublicCatalogSearchSnapshotFromInfiniteData(args: {
  userId: string;
  userSlugOrId: string;
  data: InfiniteData<PublicCatalogListing[], string | null | undefined>;
}): PublicCatalogSearchPersistedSnapshot {
  return {
    userId: args.userId,
    userSlugOrId: args.userSlugOrId,
    version: PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.version,
    persistedAt: new Date().toISOString(),
    limit: PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.queryLimit,
    data: {
      pages: args.data.pages,
      pageParams: normalizePageParamsForStorage(args.data.pageParams),
    },
  };
}

export function snapshotToInfiniteData(
  snapshot: PublicCatalogSearchPersistedSnapshot,
): PublicCatalogInfiniteData {
  return {
    pages: snapshot.data.pages,
    pageParams: restorePageParamsForRuntime(snapshot.data.pageParams),
  };
}

export async function readPublicCatalogSearchSnapshot(userId: string) {
  try {
    const snapshot = await idbGet<PublicCatalogSearchPersistedSnapshot>(userId);
    return snapshot ?? null;
  } catch {
    return null;
  }
}

export async function writePublicCatalogSearchSnapshot(
  snapshot: PublicCatalogSearchPersistedSnapshot,
) {
  try {
    await idbPut(snapshot);
  } catch {
    return;
  }
}

export async function fetchAllPublicCatalogListingsInfiniteData(args: {
  userSlugOrId: string;
  limit?: number;
}): Promise<PublicCatalogInfiniteData | null> {
  const limit = args.limit ?? PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.queryLimit;
  const pages: PublicCatalogListing[][] = [];
  const pageParams: PublicCatalogPageParam[] = [];

  let cursor: string | undefined = undefined;

  for (
    let pageIndex = 0;
    pageIndex < PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.maxPagesToPrefetch;
    pageIndex += 1
  ) {
    pageParams.push(cursor ?? null);

    const page = await getTrpcClient().public.getListings.query({
      userSlugOrId: args.userSlugOrId,
      limit,
      ...(cursor ? { cursor } : {}),
    });

    pages.push(page);
    const nextCursor = page[page.length - 1]?.id;
    if (!nextCursor) {
      break;
    }

    cursor = nextCursor;
  }

  if (pages.length === 0) {
    return null;
  }

  return {
    pages,
    pageParams,
  };
}

export async function prefetchAndPersistPublicCatalogSearchSnapshot(args: {
  userId: string;
  userSlugOrId: string;
  force?: boolean;
}) {
  if (!PUBLIC_CATALOG_SEARCH_PERSISTED_SWR.enabled) {
    return null;
  }

  if (!args.force) {
    const existing = await readPublicCatalogSearchSnapshot(args.userId);
    if (existing && isPublicCatalogSearchSnapshotFresh(existing)) {
      return existing;
    }
  }

  const inFlight = prefetchInFlight.get(args.userId);
  if (inFlight) {
    return inFlight;
  }

  const task =
    (async (): Promise<PublicCatalogSearchPersistedSnapshot | null> => {
      try {
        const infiniteData = await fetchAllPublicCatalogListingsInfiniteData({
          userSlugOrId: args.userSlugOrId,
        });

        if (!infiniteData) {
          return null;
        }

        const snapshot = createPublicCatalogSearchSnapshotFromInfiniteData({
          userId: args.userId,
          userSlugOrId: args.userSlugOrId,
          data: infiniteData,
        });

        await writePublicCatalogSearchSnapshot(snapshot);
        return snapshot;
      } catch {
        return null;
      }
    })().finally(() => {
      prefetchInFlight.delete(args.userId);
    });

  prefetchInFlight.set(args.userId, task);
  return task;
}
