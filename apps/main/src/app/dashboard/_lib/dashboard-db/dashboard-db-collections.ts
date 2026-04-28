"use client";

import {
  cleanupCultivarReferencesCollection,
  initializeCultivarReferencesCollection,
} from "./cultivar-references-collection";
import { cleanupImagesCollection, initializeImagesCollection } from "./images-collection";
import { cleanupListsCollection, initializeListsCollection } from "./lists-collection";
import {
  cleanupListingsCollection,
  initializeListingsCollection,
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

export async function initializeDashboardDbCollections(userId: string) {
  await Promise.all(dashboardDbCollections.map((entry) => entry.initialize(userId)));
}

export async function cleanupDashboardDbCollections() {
  await Promise.allSettled(dashboardDbCollections.map((entry) => entry.cleanup()));
}
