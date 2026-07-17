import { describe, expect, it } from "vitest";
import { CATALOG_IMPORT_DRAFT_STORAGE_KEY } from "@/config/catalog-importer";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
  writeCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe("catalog importer browser draft", () => {
  it("round trips progress and clears it on reset", () => {
    const storage = createStorage();
    const draft: CatalogImporterDraft = {
      activeReviewRowId: null,
      headerRowIndex: 0,
      mapping: {
        description: 2,
        imageUrl: 4,
        price: 1,
        privateNote: 3,
        title: 0,
      },
      matchedRows: null,
      matchedRowsKey: null,
      mode: "public",
      parsedSpreadsheet: {
        fileName: "catalog.csv",
        sheets: [{ name: "CSV", rows: [["name"], ["Stella de Oro"]] }],
      },
      reviewQuery: "",
      selectedSheetIndex: 0,
      version: 1,
    };

    expect(writeCatalogImporterDraft(draft, storage)).toBe("saved");
    expect(readCatalogImporterDraft(storage)).toEqual(draft);
    expect(clearCatalogImporterDraft(storage)).toBe(true);
    expect(storage.values.has(CATALOG_IMPORT_DRAFT_STORAGE_KEY)).toBe(false);
  });
});
