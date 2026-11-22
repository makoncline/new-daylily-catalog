"use client";

import {
  TEMP_LIST_STORAGE_KEY,
  tempListSchema,
  type TempListing,
} from "./temp-list";

interface TempListSnapshot {
  listings: TempListing[];
  storageError: string | null;
  recoveryRaw: string | null;
  writeBlocked: boolean;
  ready: boolean;
}
const serverSnapshot: TempListSnapshot = {
  listings: [],
  storageError: null,
  recoveryRaw: null,
  writeBlocked: false,
  ready: false,
};
let snapshot: TempListSnapshot = { ...serverSnapshot, ready: true };
let lastRaw: string | null | undefined;
let memoryOnly = false;
const listeners = new Set<() => void>();

export function getTempListServerSnapshot() {
  return serverSnapshot;
}

export function getTempListSnapshot() {
  if (memoryOnly) return snapshot;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(TEMP_LIST_STORAGE_KEY);
    if (raw !== lastRaw) {
      const listings =
        raw !== null ? tempListSchema.parse(JSON.parse(raw)) : [];
      snapshot = {
        listings,
        storageError: null,
        recoveryRaw: null,
        writeBlocked: false,
        ready: true,
      };
      lastRaw = raw;
    }
  } catch {
    memoryOnly = true;
    snapshot = {
      ...snapshot,
      recoveryRaw: raw,
      writeBlocked: true,
      ready: true,
      storageError:
        "The saved catalog could not be read. Changes are blocked. Download the saved data before you reset it.",
    };
  }
  return snapshot;
}

export function writeTempList(
  listings: TempListing[],
  { keepUnsavedRows = false } = {},
) {
  if (getTempListSnapshot().writeBlocked) {
    listeners.forEach((listener) => listener());
    return false;
  }
  const raw = JSON.stringify(listings);
  try {
    localStorage.setItem(TEMP_LIST_STORAGE_KEY, raw);
    lastRaw = raw;
    memoryOnly = false;
    snapshot = { ...snapshot, listings, storageError: null };
  } catch {
    if (keepUnsavedRows) memoryOnly = true;
    snapshot = {
      ...snapshot,
      listings: keepUnsavedRows ? listings : snapshot.listings,
      storageError: memoryOnly
        ? "This browser could not save the list. Download it before you leave this page."
        : "This browser could not save the list. Try again.",
    };
  }
  listeners.forEach((listener) => listener());
  return snapshot.storageError === null;
}

export function restoreTempListings(removed: TempListing[]) {
  const current = getTempListSnapshot().listings;
  const ids = new Set(current.map((listing) => listing.id));
  return writeTempList([
    ...current,
    ...removed.filter((listing) => !ids.has(listing.id)),
  ]);
}

export function resetTempList() {
  try {
    localStorage.setItem(TEMP_LIST_STORAGE_KEY, "[]");
    lastRaw = undefined;
    memoryOnly = false;
    getTempListSnapshot();
  } catch {
    snapshot = {
      ...snapshot,
      storageError: "This browser could not reset the saved data. Try again.",
    };
  }
  listeners.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent) {
  if (event.key !== TEMP_LIST_STORAGE_KEY && event.key !== null) return;
  if (memoryOnly && !snapshot.writeBlocked) return;
  memoryOnly = false;
  lastRaw = undefined;
  listeners.forEach((listener) => listener());
}
export function subscribeToTempList(listener: () => void) {
  if (!listeners.size) window.addEventListener("storage", handleStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", handleStorage);
  };
}
