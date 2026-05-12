"use client";

import type { PersistedCollectionPersistence } from "@tanstack/browser-db-sqlite-persistence";

export const DASHBOARD_DB_SQLITE_SCHEMA_VERSION = 1;

const DASHBOARD_DB_SQLITE_NAME = "new-daylily-catalog-dashboard.sqlite";
const DASHBOARD_DB_COORDINATOR_NAME = "new-daylily-catalog-dashboard";

let persistencePromise: Promise<PersistedCollectionPersistence | null> | null =
  null;

function isBrowserSqlitePersistenceSupported() {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function"
  );
}

export function getDashboardDbSqlitePersistence() {
  if (persistencePromise) return persistencePromise;

  persistencePromise = createDashboardDbSqlitePersistence().catch(() => {
    persistencePromise = null;
    return null;
  });

  return persistencePromise;
}

async function createDashboardDbSqlitePersistence() {
  if (!isBrowserSqlitePersistenceSupported()) {
    return null;
  }

  const {
    BrowserCollectionCoordinator,
    createBrowserWASQLitePersistence,
    openBrowserWASQLiteOPFSDatabase,
  } = await import("@tanstack/browser-db-sqlite-persistence");

  const database = await openBrowserWASQLiteOPFSDatabase({
    databaseName: DASHBOARD_DB_SQLITE_NAME,
  });

  const coordinator =
    typeof BroadcastChannel === "undefined"
      ? undefined
      : new BrowserCollectionCoordinator({
          dbName: DASHBOARD_DB_COORDINATOR_NAME,
        });

  return createBrowserWASQLitePersistence({
    database,
    coordinator,
    schemaMismatchPolicy: "sync-present-reset",
  });
}

export function resetDashboardDbSqlitePersistenceForTests() {
  persistencePromise = null;
}
