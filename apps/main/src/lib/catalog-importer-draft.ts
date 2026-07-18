import { del, get, set } from "idb-keyval";
import {
  CATALOG_IMPORT_DRAFT_STORAGE_KEY,
  CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY,
} from "@/config/catalog-importer";
import type {
  CatalogColumnMapping,
  CatalogImportRow,
  ParsedSpreadsheet,
} from "@/lib/catalog-importer";

export interface CatalogImporterDraft {
  activeReviewRowId: string | null;
  headerRowIndex: number | null;
  mapping: CatalogColumnMapping;
  matchedRows: CatalogImportRow[] | null;
  matchedRowsKey: string | null;
  parsedSpreadsheet: ParsedSpreadsheet | null;
  selectedSheetIndex: number;
  version: 2;
}

export interface DraftStorage {
  delete: (key: string) => Promise<void>;
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
}

function getStorage(storage?: DraftStorage | null): DraftStorage | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return null;
  }

  return { delete: del, get, set };
}

function isCatalogImporterDraft(value: unknown): value is CatalogImporterDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<CatalogImporterDraft>;
  return (
    draft.version === 2 &&
    Number.isInteger(draft.selectedSheetIndex) &&
    (draft.parsedSpreadsheet === null ||
      (typeof draft.parsedSpreadsheet?.fileName === "string" &&
        Array.isArray(draft.parsedSpreadsheet.sheets))) &&
    typeof draft.mapping === "object" &&
    draft.mapping !== null
  );
}

function migrateLegacyDraft(value: unknown): CatalogImporterDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const draft = value as Record<string, unknown>;
  const mapping = draft.mapping as Partial<CatalogColumnMapping> | undefined;
  const parsedSpreadsheet = draft.parsedSpreadsheet as
    | ParsedSpreadsheet
    | null
    | undefined;

  if (
    draft.version !== 1 ||
    !Number.isInteger(draft.selectedSheetIndex) ||
    !mapping ||
    (parsedSpreadsheet !== null &&
      (typeof parsedSpreadsheet?.fileName !== "string" ||
        !Array.isArray(parsedSpreadsheet.sheets)))
  ) {
    return null;
  }

  const matchedRows = Array.isArray(draft.matchedRows)
    ? (draft.matchedRows as CatalogImportRow[]).map((row) => ({
        ...row,
        cultivarReferenceIdWarning: row.cultivarReferenceIdWarning ?? null,
        duplicateAccepted: row.duplicateAccepted ?? false,
        removed: row.removed ?? false,
        sourceCultivarReferenceId: row.sourceCultivarReferenceId ?? "",
      }))
    : null;

  return {
    activeReviewRowId:
      typeof draft.activeReviewRowId === "string"
        ? draft.activeReviewRowId
        : null,
    headerRowIndex:
      typeof draft.headerRowIndex === "number" ? draft.headerRowIndex : null,
    mapping: {
      cultivarReferenceId: null,
      description:
        typeof mapping.description === "number" ? mapping.description : null,
      imageUrl: typeof mapping.imageUrl === "number" ? mapping.imageUrl : null,
      price: typeof mapping.price === "number" ? mapping.price : null,
      privateNote:
        typeof mapping.privateNote === "number" ? mapping.privateNote : null,
      title: typeof mapping.title === "number" ? mapping.title : null,
    },
    matchedRows,
    matchedRowsKey:
      typeof draft.matchedRowsKey === "string" ? draft.matchedRowsKey : null,
    parsedSpreadsheet: parsedSpreadsheet ?? null,
    selectedSheetIndex: draft.selectedSheetIndex as number,
    version: 2,
  };
}

export async function migrateLegacyCatalogImporterDraft(storage: DraftStorage) {
  try {
    const rawValue = window.localStorage.getItem(
      CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY,
    );
    if (!rawValue) {
      return null;
    }

    const draft = migrateLegacyDraft(JSON.parse(rawValue) as unknown);
    if (!draft) {
      window.localStorage.removeItem(CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY);
      return null;
    }

    await storage.set(CATALOG_IMPORT_DRAFT_STORAGE_KEY, draft);
    window.localStorage.removeItem(CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY);
    return draft;
  } catch {
    return null;
  }
}

export async function readCatalogImporterDraft(
  storage?: DraftStorage | null,
): Promise<CatalogImporterDraft | null> {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) {
    return null;
  }

  try {
    const draft = await selectedStorage.get(CATALOG_IMPORT_DRAFT_STORAGE_KEY);
    if (isCatalogImporterDraft(draft)) {
      return draft;
    }

    if (!storage) {
      const legacyDraft =
        await migrateLegacyCatalogImporterDraft(selectedStorage);
      if (legacyDraft) {
        return legacyDraft;
      }
    }

    await selectedStorage.delete(CATALOG_IMPORT_DRAFT_STORAGE_KEY);
  } catch {
    try {
      await selectedStorage.delete(CATALOG_IMPORT_DRAFT_STORAGE_KEY);
    } catch {
      // The page can still run without browser persistence.
    }
  }

  return null;
}

export async function writeCatalogImporterDraft(
  draft: CatalogImporterDraft,
  storage?: DraftStorage | null,
): Promise<"saved" | "unavailable"> {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) {
    return "unavailable";
  }

  try {
    await selectedStorage.set(CATALOG_IMPORT_DRAFT_STORAGE_KEY, draft);
    return "saved";
  } catch {
    return "unavailable";
  }
}

export async function clearCatalogImporterDraft(
  storage?: DraftStorage | null,
): Promise<boolean> {
  const selectedStorage = getStorage(storage);
  if (!selectedStorage) {
    return false;
  }

  try {
    await selectedStorage.delete(CATALOG_IMPORT_DRAFT_STORAGE_KEY);
    if (!storage && typeof window !== "undefined") {
      window.localStorage.removeItem(CATALOG_IMPORT_DRAFT_STORAGE_KEY);
      window.localStorage.removeItem(CATALOG_IMPORT_LEGACY_DRAFT_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}
