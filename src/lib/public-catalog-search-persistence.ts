"use client";

import { type InfiniteData } from "@tanstack/react-query";
import { CACHE_CONFIG } from "@/config/cache-config";
import { type RouterOutputs } from "@/trpc/react";

type PublicCatalogListing = RouterOutputs["public"]["getListings"][number];
type PublicCatalogPageParam = string | null;
type PublicCatalogPersistedPageParam = string | null;

export type PublicCatalogInfiniteData = InfiniteData<
  PublicCatalogListing[],
  PublicCatalogPageParam
>;

export const PUBLIC_CATALOG_SEARCH_PERSISTED_SWR = {
  enabled: false,
  version: 1,
  ttlMs: CACHE_CONFIG.PUBLIC.SEARCH.CLIENT_STALE_TIME_MS,
  revalidateAfterMs: CACHE_CONFIG.PUBLIC.SEARCH.CLIENT_STALE_TIME_MS,
  queryLimit: 500,
  maxPagesToPrefetch: 0,
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
  _snapshot: PublicCatalogSearchPersistedSnapshot,
) {
  return false;
}

export function shouldRevalidatePublicCatalogSearchSnapshot(
  _snapshot: PublicCatalogSearchPersistedSnapshot,
) {
  return false;
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

export async function readPublicCatalogSearchSnapshot(_userId: string) {
  return null;
}

export async function writePublicCatalogSearchSnapshot(
  _snapshot: PublicCatalogSearchPersistedSnapshot,
) {
  return;
}

export async function fetchAllPublicCatalogListingsInfiniteData(_args: {
  userSlugOrId: string;
  limit?: number;
}): Promise<PublicCatalogInfiniteData | null> {
  return null;
}

export async function prefetchAndPersistPublicCatalogSearchSnapshot(_args: {
  userId: string;
  userSlugOrId: string;
  force?: boolean;
}) {
  return null;
}
