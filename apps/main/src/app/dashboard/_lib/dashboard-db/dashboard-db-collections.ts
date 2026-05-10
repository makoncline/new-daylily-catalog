"use client";

import {
  cleanupCultivarReferencesCollection,
  initializeCultivarReferencesCollection,
} from "./cultivar-references-collection";
import {
  cleanupImagesCollection,
  initializeImagesCollection,
} from "./images-collection";
import {
  cleanupListsCollection,
  initializeListsCollection,
} from "./lists-collection";
import {
  cleanupListingsCollection,
  initializeListingsCollection,
} from "./listings-collection";

interface DashboardDbCollectionLifecycle {
  cleanup: () => Promise<void>;
  initialize: (userId: string) => Promise<void>;
}

const dashboardDbCollections: DashboardDbCollectionLifecycle[] = [
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

export async function cleanupDashboardDbCollections() {
  await Promise.allSettled(
    dashboardDbCollections.map((entry) => entry.cleanup()),
  );
}
