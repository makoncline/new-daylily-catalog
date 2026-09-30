"use client";

import {
  TEMP_LIST_STORAGE_KEY,
  tempListSchema,
  type TempListing,
} from "./temp-list";

interface TempListSnapshot {
  listings: TempListing[];
  storageError: string | null;
  ready: boolean;
}

const serverSnapshot: TempListSnapshot = {
  listings: [],
  storageError: null,
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
  try {
    const raw = localStorage.getItem(TEMP_LIST_STORAGE_KEY);
    if (raw !== lastRaw) {
      snapshot = {
        listings: raw ? tempListSchema.parse(JSON.parse(raw)) : [],
        storageError: null,
        ready: true,
      };
      lastRaw = raw;
    }
  } catch {
    memoryOnly = true;
    snapshot = {
      ...snapshot,
      storageError:
        "The saved list could not be read. You can still use this page and download your list.",
    };
  }
  return snapshot;
}

export function writeTempList(listings: TempListing[]) {
  const raw = JSON.stringify(listings);
  let storageError: string | null = null;
  try {
    localStorage.setItem(TEMP_LIST_STORAGE_KEY, raw);
    lastRaw = raw;
    memoryOnly = false;
  } catch {
    memoryOnly = true;
    storageError =
      "This browser could not save the list. Download it before you leave this page.";
  }
  snapshot = { listings, storageError, ready: true };
  listeners.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent) {
  if (event.key !== TEMP_LIST_STORAGE_KEY && event.key !== null) return;
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
