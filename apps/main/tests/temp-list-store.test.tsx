import { useSyncExternalStore } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import writeExcelFile from "write-excel-file/node";
import {
  createTempListing,
  createTempListSpreadsheet,
  toTempPreviewRow,
  TEMP_LIST_STORAGE_KEY,
  MAX_TEMP_LISTINGS,
} from "@/app/(public)/playground/_lib/temp-list";
import { readDashboardImportFile } from "@/app/dashboard/imports/_components/dashboard-import-file";
import type * as TempListStore from "@/app/(public)/playground/_lib/temp-list-store";

let store: typeof TempListStore;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  store = await import("@/app/(public)/playground/_lib/temp-list-store");
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

  it("keeps unsaved rows and the warning after another tab saves, until the next save here", () => {
    const view = renderHook(useSnapshot);
    const draft = createTempListing("Garden seedling");
    const write = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });
    act(() => {
      expect(store.writeTempList([draft], { keepUnsavedRows: true })).toBe(
        false,
      );
    });
    expect(view.result.current.listings).toEqual([draft]);
    expect(view.result.current.storageError).toContain("could not save");
    expect(store.getTempListSnapshot()).toBe(view.result.current);

    write.mockRestore();
    act(() => {
      const other = JSON.stringify([createTempListing("Other tab seedling")]);
      localStorage.setItem(TEMP_LIST_STORAGE_KEY, other);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: TEMP_LIST_STORAGE_KEY,
          newValue: other,
          storageArea: localStorage,
        }),
      );
    });
    expect(view.result.current.listings).toEqual([draft]);
    expect(view.result.current.storageError).toContain(
      "Download it before you leave",
    );

    act(() => store.writeTempList([draft]));
    expect(view.result.current.storageError).toBeNull();
    expect(JSON.parse(localStorage.getItem(TEMP_LIST_STORAGE_KEY)!)).toEqual([
      draft,
    ]);
  });
});

describe("catalog preservation", () => {
  it("restores a removed row above capacity and exports all rows for the dashboard importer", async () => {
    const full = Array.from({ length: MAX_TEMP_LISTINGS }, (_, i) =>
      createTempListing(`Flower ${i}`),
    );
    store.writeTempList(full);
    store.writeTempList(full.slice(1));
    store.writeTempList([...full.slice(1), createTempListing("Replacement")]);
    store.restoreTempListings([full[0]!]);
    store.restoreTempListings([full[0]!]);
    expect(store.getTempListSnapshot().listings).toHaveLength(
      MAX_TEMP_LISTINGS + 1,
    );
    vi.resetModules();
    store = await import("@/app/(public)/playground/_lib/temp-list-store");
    const { listings, storageError } = store.getTempListSnapshot();
    expect(listings).toHaveLength(MAX_TEMP_LISTINGS + 1);
    expect(storageError).toBeNull();

    const { fileName, sheets } = createTempListSpreadsheet(
      listings.map((listing) => toTempPreviewRow(listing, null)),
    );
    const buffer = await writeExcelFile(
      sheets.map(({ name, rows }) => ({ sheet: name, data: rows })),
    ).toBuffer();
    const bytes = Uint8Array.from(buffer);
    const file = Object.assign(new File([bytes], fileName), {
      arrayBuffer: async () => bytes.buffer,
    });
    const imported = await readDashboardImportFile(file);
    expect(
      imported?.map((row) => ("listing" in row ? row.listing.title : null)),
    ).toEqual(listings.map((listing) => listing.name));
  });

  it("blocks adds and edits to corrupt storage until an explicit reset", () => {
    const view = renderHook(useSnapshot);
    const raw = '[{"name":"Keep this source"},';
    localStorage.setItem(TEMP_LIST_STORAGE_KEY, raw);
    act(() => {
      expect(store.writeTempList([createTempListing("Add")])).toBe(false);
    });
    expect(view.result.current).toMatchObject({
      writeBlocked: true,
      recoveryRaw: raw,
    });
    expect(store.writeTempList([createTempListing("Add")])).toBe(false);
    act(() => {
      expect(store.writeTempList([])).toBe(false);
    });
    expect(localStorage.getItem(TEMP_LIST_STORAGE_KEY)).toBe(raw);
    act(() => store.resetTempList());
    expect(store.getTempListSnapshot()).toMatchObject({
      writeBlocked: false,
      listings: [],
    });
    act(() => {
      expect(store.writeTempList([createTempListing("New catalog")])).toBe(
        true,
      );
    });
  });
});
