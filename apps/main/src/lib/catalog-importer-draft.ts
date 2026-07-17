import {
  CATALOG_IMPORT_DRAFT_MAX_LENGTH,
  CATALOG_IMPORT_DRAFT_STORAGE_KEY,
} from "@/config/catalog-importer";
import type {
  CatalogColumnMapping,
  CatalogImportRow,
  ParsedSpreadsheet,
} from "@/lib/catalog-importer";

export type CatalogImporterMode = "public" | "pro";

export interface CatalogImporterDraft {
  activeReviewRowId: string | null;
  headerRowIndex: number | null;
  mapping: CatalogColumnMapping;
  matchedRows: CatalogImportRow[] | null;
  matchedRowsKey: string | null;
  mode: CatalogImporterMode;
  parsedSpreadsheet: ParsedSpreadsheet | null;
  reviewQuery: string;
  selectedSheetIndex: number;
  version: 1;
}

type DraftStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function getStorage(storage?: DraftStorage | null) {
  if (storage) {
    return storage;
  }

  return typeof window === "undefined" ? null : window.localStorage;
}

function isCatalogImporterDraft(value: unknown): value is CatalogImporterDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<CatalogImporterDraft>;
  return (
    draft.version === 1 &&
    (draft.mode === "public" || draft.mode === "pro") &&
    Number.isInteger(draft.selectedSheetIndex) &&
    (draft.parsedSpreadsheet === null ||
      (typeof draft.parsedSpreadsheet?.fileName === "string" &&
        Array.isArray(draft.parsedSpreadsheet.sheets))) &&
    typeof draft.mapping === "object" &&
    draft.mapping !== null
  );
}

export function readCatalogImporterDraft(
  storage?: DraftStorage | null,
): CatalogImporterDraft | null {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) {
    return null;
  }

  try {
    const rawValue = selectedStorage.getItem(CATALOG_IMPORT_DRAFT_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const draft = JSON.parse(rawValue) as unknown;
    if (isCatalogImporterDraft(draft)) {
      return draft;
    }

    selectedStorage.removeItem(CATALOG_IMPORT_DRAFT_STORAGE_KEY);
  } catch {
    try {
      selectedStorage.removeItem(CATALOG_IMPORT_DRAFT_STORAGE_KEY);
    } catch {
      // The page can still run without browser persistence.
    }
  }

  return null;
}

export function writeCatalogImporterDraft(
  draft: CatalogImporterDraft,
  storage?: DraftStorage | null,
): "saved" | "too-large" | "unavailable" {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) {
    return "unavailable";
  }

  try {
    const rawValue = JSON.stringify(draft);
    if (rawValue.length > CATALOG_IMPORT_DRAFT_MAX_LENGTH) {
      return "too-large";
    }
    selectedStorage.setItem(CATALOG_IMPORT_DRAFT_STORAGE_KEY, rawValue);
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function clearCatalogImporterDraft(storage?: DraftStorage | null) {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) {
    return false;
  }

  try {
    selectedStorage.removeItem(CATALOG_IMPORT_DRAFT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
