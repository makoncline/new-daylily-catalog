"use client";

import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";
import {
  resetCultivarReferencesCollectionWithPersistence,
} from "./cultivar-references-collection";
import {
  resetImagesCollectionWithPersistence,
} from "./images-collection";
import {
  resetListsCollectionWithPersistence,
} from "./lists-collection";
import {
  resetListingsCollectionWithPersistence,
} from "./listings-collection";

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
