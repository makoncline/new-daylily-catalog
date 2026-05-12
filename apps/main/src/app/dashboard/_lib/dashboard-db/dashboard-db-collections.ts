"use client";

import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";
import {
  cleanupCultivarReferencesCollection,
  initializeCultivarReferencesCollection,
  resetCultivarReferencesCollectionWithPersistence,
  cultivarReferencesCollection,
} from "./cultivar-references-collection";
import {
  cleanupImagesCollection,
  initializeImagesCollection,
  resetImagesCollectionWithPersistence,
  imagesCollection,
} from "./images-collection";
import {
  cleanupListsCollection,
  initializeListsCollection,
  resetListsCollectionWithPersistence,
  listsCollection,
} from "./lists-collection";
import {
  cleanupListingsCollection,
  initializeListingsCollection,
  resetListingsCollectionWithPersistence,
  listingsCollection,
} from "./listings-collection";

export interface DashboardDbCollectionLifecycle {
  cleanup: () => Promise<void>;
  initialize: (userId: string) => Promise<void>;
}

export const dashboardDbCollections: DashboardDbCollectionLifecycle[] = [
  {
    cleanup: cleanupListingsCollection,
    initialize: initializeListingsCollection,
  },
  {
    cleanup: cleanupListsCollection,
    initialize: initializeListsCollection,
  },
  {
    cleanup: cleanupImagesCollection,
    initialize: initializeImagesCollection,
  },
  {
    cleanup: cleanupCultivarReferencesCollection,
    initialize: initializeCultivarReferencesCollection,
  },
];

let configuredPersistenceKey = "memory:none";

export function configureDashboardDbCollectionsPersistence(args: {
  persistence: PersistedCollectionPersistence | null;
  userId: string | null;
}) {
  const nextKey = `${args.persistence ? "sqlite" : "memory"}:${args.userId ?? "none"}`;
  if (configuredPersistenceKey === nextKey) return;

  configuredPersistenceKey = nextKey;
  resetListingsCollectionWithPersistence(args.persistence, args.userId);
  resetListsCollectionWithPersistence(args.persistence, args.userId);
  resetImagesCollectionWithPersistence(args.persistence, args.userId);
  resetCultivarReferencesCollectionWithPersistence(
    args.persistence,
    args.userId,
  );
}

export async function initializeDashboardDbCollections(userId: string) {
  await Promise.all(
    dashboardDbCollections.map((entry) => entry.initialize(userId)),
  );
}

export async function preloadDashboardDbCollections() {
  await Promise.all([
    listingsCollection.preload(),
    listsCollection.preload(),
    imagesCollection.preload(),
    cultivarReferencesCollection.preload(),
  ]);
}

export async function cleanupDashboardDbCollections() {
  await Promise.allSettled(
    dashboardDbCollections.map((entry) => entry.cleanup()),
  );
}
