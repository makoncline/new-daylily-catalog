import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  CATALOG_IMPORT_DRAFT_STORAGE_KEY,
  CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY,
} from "@/config/catalog-importer";
import {
  clearCatalogImporterDraft,
  migrateLegacyCatalogImporterDraft,
  readCatalogImporterDraft,
  writeCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import { createCatalogImportRows } from "@/lib/catalog-importer";

function createStorage() {
  const values = new Map<string, unknown>();
  return {
    delete: async (key: string) => {
      values.delete(key);
    },
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      values.set(key, value);
    },
    values,
  };
}

describe("catalog importer browser draft", () => {
  afterEach(async () => {
    await clearCatalogImporterDraft();
  });

  it("round trips progress and clears it on reset", async () => {
    const storage = createStorage();
    const draft: CatalogImporterDraft = {
      activeReviewRowId: null,
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: 2,
        imageUrl: 4,
        price: 1,
        privateNote: 3,
        title: 0,
      },
      matchedRows: null,
      matchedRowsKey: null,
      parsedSpreadsheet: {
        fileName: "catalog.csv",
        sheets: [{ name: "CSV", rows: [["name"], ["Stella de Oro"]] }],
      },
      selectedSheetIndex: 0,
      version: 3,
    };

    await expect(writeCatalogImporterDraft(draft, storage)).resolves.toBe(
      "saved",
    );
    await expect(readCatalogImporterDraft(storage)).resolves.toEqual(draft);
    await expect(clearCatalogImporterDraft(storage)).resolves.toBe(true);
    expect(storage.values.has(CATALOG_IMPORT_DRAFT_STORAGE_KEY)).toBe(false);
  });

  it("keeps drafts larger than the old localStorage limit", async () => {
    const largeCell = "x".repeat(4_100_000);
    const draft: CatalogImporterDraft = {
      activeReviewRowId: null,
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: null,
        imageUrl: null,
        price: null,
        privateNote: null,
        title: 0,
      },
      matchedRows: null,
      matchedRowsKey: null,
      parsedSpreadsheet: {
        fileName: "large-catalog.csv",
        sheets: [{ name: "CSV", rows: [["name"], [largeCell]] }],
      },
      selectedSheetIndex: 0,
      version: 3,
    };

    await expect(writeCatalogImporterDraft(draft)).resolves.toBe("saved");
    await expect(readCatalogImporterDraft()).resolves.toEqual(draft);
  });

  it("moves a valid v1 localStorage draft into IndexedDB", async () => {
    window.localStorage.setItem(
      CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY,
      JSON.stringify({
        activeReviewRowId: null,
        headerRowIndex: 0,
        mapping: {
          description: null,
          imageUrl: null,
          price: null,
          privateNote: null,
          title: 0,
        },
        matchedRows: null,
        matchedRowsKey: null,
        mode: "public",
        parsedSpreadsheet: {
          fileName: "legacy.csv",
          sheets: [{ name: "CSV", rows: [["name"], ["Vanguard"]] }],
        },
        reviewQuery: "",
        selectedSheetIndex: 0,
        version: 1,
      }),
    );

    await expect(readCatalogImporterDraft()).resolves.toMatchObject({
      mapping: {
        cultivarReferenceId: null,
        title: 0,
      },
      parsedSpreadsheet: { fileName: "legacy.csv" },
      version: 3,
    });
    expect(
      window.localStorage.getItem(CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY),
    ).toBeNull();
    await expect(readCatalogImporterDraft()).resolves.toMatchObject({
      parsedSpreadsheet: { fileName: "legacy.csv" },
      version: 3,
    });
  });

  it("migrates v2 IndexedDB row state and provenance without losing progress", async () => {
    const storage = createStorage();
    const [currentRow] = createCatalogImportRows({
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: null,
        imageUrl: null,
        price: null,
        privateNote: null,
        title: 0,
      },
      rows: [["name"], ["Vanguard 2"]],
    });
    const {
      linkProvenance: _linkProvenance,
      linkState: _linkState,
      outputState: _outputState,
      rowKind: _rowKind,
      ...legacyRow
    } = currentRow!;
    const match = {
      bloomSizeIn: null,
      bloomSeason: null,
      color: null,
      confidence: 82,
      cultivarReferenceId: "cultivar-vanguard",
      displayName: "Vanguard",
      form: null,
      hybridizer: null,
      imageAsset: null,
      imageUrl: null,
      listingCount: 0,
      normalizedName: "vanguard",
      ploidy: null,
      rebloom: null,
      scapeHeightIn: null,
      year: null,
    };
    await storage.set(CATALOG_IMPORT_DRAFT_STORAGE_KEY, {
      activeReviewRowId: null,
      headerRowIndex: 0,
      mapping: {
        cultivarReferenceId: null,
        description: null,
        imageUrl: null,
        price: null,
        privateNote: null,
        title: 0,
      },
      matchedRows: [
        {
          ...legacyRow,
          match,
          matchStatus: "selected",
          removed: false,
          skipped: false,
          suggestedMatch: match,
        },
      ],
      matchedRowsKey: "matched",
      parsedSpreadsheet: {
        fileName: "catalog.csv",
        sheets: [{ name: "CSV", rows: [["name"], ["Vanguard 2"]] }],
      },
      selectedSheetIndex: 0,
      version: 2,
    });

    const migrated = await readCatalogImporterDraft(storage);

    expect(migrated).toMatchObject({
      matchedRows: [
        {
          linkProvenance: "user-confirmed",
          linkState: "linked",
          outputState: "included",
          rowKind: "listing",
        },
      ],
      matchedRowsKey: "matched",
      version: 3,
    });
    expect(migrated?.matchedRows?.[0]).not.toHaveProperty("matchStatus");
    await expect(readCatalogImporterDraft(storage)).resolves.toEqual(migrated);
  });

  it("keeps a legacy draft when IndexedDB migration fails", async () => {
    const legacyDraft = JSON.stringify({
      activeReviewRowId: null,
      headerRowIndex: 0,
      mapping: {
        description: null,
        imageUrl: null,
        price: null,
        privateNote: null,
        title: 0,
      },
      matchedRows: null,
      matchedRowsKey: null,
      parsedSpreadsheet: {
        fileName: "legacy.csv",
        sheets: [{ name: "CSV", rows: [["name"], ["Vanguard"]] }],
      },
      selectedSheetIndex: 0,
      version: 1,
    });
    const storage = createStorage();
    storage.set = async () => {
      throw new Error("IndexedDB unavailable");
    };
    window.localStorage.setItem(
      CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY,
      legacyDraft,
    );

    await expect(
      migrateLegacyCatalogImporterDraft(storage),
    ).resolves.toBeNull();
    expect(
      window.localStorage.getItem(CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY),
    ).toBe(legacyDraft);
  });
});
