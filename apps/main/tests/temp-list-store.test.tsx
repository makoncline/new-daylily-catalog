import { useSyncExternalStore } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTempListing,
  TEMP_LIST_STORAGE_KEY,
} from "@/app/(public)/temp-list/_lib/temp-list";
import type * as TempListStore from "@/app/(public)/temp-list/_lib/temp-list-store";

let store: typeof TempListStore;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  store = await import("@/app/(public)/temp-list/_lib/temp-list-store");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function useSnapshot() {
  return useSyncExternalStore(
    store.subscribeToTempList,
    store.getTempListSnapshot,
    store.getTempListServerSnapshot,
  );
}

describe("temp list browser store", () => {
  it("restores saved fields and keeps subscribers in sync with writes and other tabs", () => {
    const original = {
      ...createTempListing("Millions of Peaches"),
      price: 15.5,
      privateNote: "Row 2",
    };
    localStorage.setItem(TEMP_LIST_STORAGE_KEY, JSON.stringify([original]));
    const first = renderHook(useSnapshot);
    const second = renderHook(useSnapshot);
    expect(first.result.current.listings).toEqual([original]);
    expect(store.getTempListSnapshot()).toBe(store.getTempListSnapshot());

    const edited = { ...original, description: "Peach blooms" };
    act(() => store.writeTempList([edited]));
    expect(first.result.current.listings).toEqual([edited]);
    expect(second.result.current.listings).toEqual([edited]);
    expect(JSON.parse(localStorage.getItem(TEMP_LIST_STORAGE_KEY)!)).toEqual([
      edited,
    ]);

    act(() => {
      localStorage.removeItem(TEMP_LIST_STORAGE_KEY);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: TEMP_LIST_STORAGE_KEY,
          storageArea: localStorage,
        }),
      );
    });
    expect(first.result.current.listings).toEqual([]);
    expect(second.result.current.listings).toEqual([]);
  });

  it("keeps the working list available when persistence fails and recovers on the next save", () => {
    const view = renderHook(useSnapshot);
    const draft = createTempListing("Garden seedling");
    const write = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });
    act(() => store.writeTempList([draft]));
    expect(view.result.current.listings).toEqual([draft]);
    expect(view.result.current.storageError).toContain("could not save");
    expect(store.getTempListSnapshot()).toBe(view.result.current);

    write.mockRestore();
    act(() => store.writeTempList([draft]));
    expect(view.result.current.storageError).toBeNull();
    expect(JSON.parse(localStorage.getItem(TEMP_LIST_STORAGE_KEY)!)).toEqual([
      draft,
    ]);
  });
});
