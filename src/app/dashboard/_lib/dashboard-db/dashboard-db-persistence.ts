"use client";

import {
  cultivarReferencesCollection,
} from "@/app/dashboard/_lib/dashboard-db/cultivar-references-collection";
import { imagesCollection } from "@/app/dashboard/_lib/dashboard-db/images-collection";
import { listingsCollection } from "@/app/dashboard/_lib/dashboard-db/listings-collection";
import { listsCollection } from "@/app/dashboard/_lib/dashboard-db/lists-collection";

export const DASHBOARD_DB_PERSISTED_SWR = {
  enabled: false,
  ttlMs: 0,
  version: 1,
} as const;

export interface DashboardDbPersistedSnapshot {
  userId: string;
  version: number;
  persistedAt: Date;
  listings: unknown[];
  lists: unknown[];
  images: unknown[];
  cultivarReferences: unknown[];
}

export async function readDashboardDbSnapshot(_userId: string) {
  return null;
}

export async function writeDashboardDbSnapshot(
  _snapshot: DashboardDbPersistedSnapshot,
) {
  return;
}

export async function deleteDashboardDbSnapshot(_userId: string) {
  return;
}

export async function tryHydrateDashboardDbFromPersistence(_userId: string) {
  return false;
}

export async function persistDashboardDbToPersistence(_userId: string) {
  return;
}

export async function revalidateDashboardDbInBackground(_userId: string) {
  await Promise.all([
    listingsCollection.utils.refetch(),
    listsCollection.utils.refetch(),
    imagesCollection.utils.refetch(),
    cultivarReferencesCollection.utils.refetch(),
  ]).catch(() => undefined);
}

export function schedulePersistDashboardDbForCurrentUser(_args?: {
  delayMs?: number;
}) {
  return;
}
