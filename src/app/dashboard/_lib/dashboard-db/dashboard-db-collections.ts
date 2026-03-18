"use client";

import { cultivarReferencesCollection, initializeCultivarReferencesCollection } from "./cultivar-references-collection";
import { imagesCollection, initializeImagesCollection } from "./images-collection";
import { listsCollection, initializeListsCollection } from "./lists-collection";
import { listingsCollection, initializeListingsCollection } from "./listings-collection";

export interface DashboardDbCollectionLifecycle {
  cleanup: () => Promise<void>;
  initialize: (userId: string) => Promise<void>;
}

export const dashboardDbCollections: DashboardDbCollectionLifecycle[] = [
  {
    cleanup: () => listingsCollection.cleanup(),
    initialize: initializeListingsCollection,
  },
  {
    cleanup: () => listsCollection.cleanup(),
    initialize: initializeListsCollection,
  },
  {
    cleanup: () => imagesCollection.cleanup(),
    initialize: initializeImagesCollection,
  },
  {
    cleanup: () => cultivarReferencesCollection.cleanup(),
    initialize: initializeCultivarReferencesCollection,
  },
];

export async function initializeDashboardDbCollections(userId: string) {
  await Promise.all(dashboardDbCollections.map((entry) => entry.initialize(userId)));
}

export async function cleanupDashboardDbCollections() {
  await Promise.allSettled(dashboardDbCollections.map((entry) => entry.cleanup()));
}

