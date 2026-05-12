"use client";

import { persistedCollectionOptions } from "@tanstack/browser-db-sqlite-persistence";
import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";
import { DASHBOARD_DB_SQLITE_SCHEMA_VERSION } from "./dashboard-db-sqlite-persistence";

export function dashboardDbCollectionId(args: {
  name: string;
  userId: string | null;
}) {
  return `dashboard-db:${args.name}:${args.userId ?? "memory"}`;
}

export function withDashboardDbPersistence<TItem extends object>(args: {
  options: object;
  persistence: PersistedCollectionPersistence | null;
  collectionId: string;
}) {
  const optionsWithId = {
    ...args.options,
    id: args.collectionId,
  };

  if (!args.persistence) {
    return optionsWithId;
  }

  return persistedCollectionOptions<TItem, string>({
    ...optionsWithId,
    persistence: args.persistence,
    schemaVersion: DASHBOARD_DB_SQLITE_SCHEMA_VERSION,
  } as Parameters<typeof persistedCollectionOptions<TItem, string>>[0]);
}
