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
  initialIssueCount?: number;
  initialReviewCount?: number;
  mapping: CatalogColumnMapping;
  matchedRows: CatalogImportRow[] | null;
  matchedRowsKey: string | null;
  parsedSpreadsheet: ParsedSpreadsheet | null;
  projectId?: string;
  selectedSheetIndex: number;
  version: 3;
}

export function createCatalogImporterProjectId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `catalog-import-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function normalizeManualCatalogSpreadsheet(
  spreadsheet: ParsedSpreadsheet | null,
) {
  if (spreadsheet?.source !== "manual") {
    return spreadsheet;
  }

  let changed = false;
  const sheets = spreadsheet.sheets.map((sheet) => {
    if (sheet.rows[0]?.[4] !== "Daylily Catalog ID") {
      return sheet;
    }

    const rows = sheet.rows.map((row, rowIndex) => {
      if (
        rowIndex === 0 ||
        String(row[4] ?? "").trim() ||
        !String(row[5] ?? "").trim()
      ) {
        return row;
      }

      const nextRow = [...row];
      nextRow[4] = nextRow[5]!;
      nextRow.splice(5, 1);
      changed = true;
      return nextRow;
    });

    return rows === sheet.rows ? sheet : { ...sheet, rows };
  });

  return changed ? { ...spreadsheet, sheets } : spreadsheet;
}

function normalizeCatalogImporterDraft(draft: CatalogImporterDraft) {
  const projectId =
    typeof draft.projectId === "string" && draft.projectId.length > 0
      ? draft.projectId
      : createCatalogImporterProjectId();
  const matchedRows =
    draft.matchedRows?.map((row) => ({
      ...row,
      existingListingDecision:
        row.existingListingDecision === "create" ||
        row.existingListingDecision === "use-existing"
          ? row.existingListingDecision
          : null,
      imagePreviewAccepted: false,
      imageUrl: "",
      imageUrlWarning: null,
      sourceImageUrl: "",
    })) ?? null;

  return {
    ...draft,
    mapping: { ...draft.mapping, imageUrl: null },
    matchedRows,
    parsedSpreadsheet: normalizeManualCatalogSpreadsheet(
      draft.parsedSpreadsheet,
    ),
    projectId,
  };
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
    draft.version === 3 &&
    Number.isInteger(draft.selectedSheetIndex) &&
    (draft.parsedSpreadsheet === null ||
      (typeof draft.parsedSpreadsheet?.fileName === "string" &&
        Array.isArray(draft.parsedSpreadsheet.sheets))) &&
    typeof draft.mapping === "object" &&
    draft.mapping !== null
  );
}

function migrateCatalogImportRow(value: unknown): CatalogImportRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const legacy = value as Record<string, unknown>;
  const match = legacy.match as CatalogImportRow["match"];
  const suggestedMatch =
    legacy.suggestedMatch as CatalogImportRow["suggestedMatch"];
  const legacyMatchStatus =
    typeof legacy.matchStatus === "string" ? legacy.matchStatus : null;
  const rowKind =
    legacy.rowKind === "ignored" || legacy.rowKind === "listing"
      ? legacy.rowKind
      : legacy.skipped === true &&
          legacy.removed !== true &&
          legacyMatchStatus !== "unmatched"
        ? "ignored"
        : "listing";
  const outputState =
    legacy.outputState === "removed" || legacy.outputState === "included"
      ? legacy.outputState
      : legacy.removed === true
        ? "removed"
        : "included";
  const linkState =
    legacy.linkState === "linked" ||
    legacy.linkState === "pending" ||
    legacy.linkState === "intentionally-unmatched"
      ? legacy.linkState
      : match
        ? "linked"
        : legacyMatchStatus === "unmatched"
          ? "intentionally-unmatched"
          : "pending";
  const savedProvenance = legacy.linkProvenance;
  const linkProvenance =
    savedProvenance === "automatic-name" ||
    savedProvenance === "exact-name" ||
    savedProvenance === "saved-id" ||
    savedProvenance === "user-confirmed"
      ? savedProvenance
      : linkState !== "linked"
        ? null
        : typeof legacy.sourceCultivarReferenceId === "string" &&
            legacy.sourceCultivarReferenceId.length > 0 &&
            match?.cultivarReferenceId === legacy.sourceCultivarReferenceId
          ? "saved-id"
          : legacyMatchStatus === "exact"
            ? "exact-name"
            : match?.cultivarReferenceId ===
                  suggestedMatch?.cultivarReferenceId &&
                (match?.confidence ?? 0) > 90
              ? "automatic-name"
              : "user-confirmed";
  const current = { ...legacy };
  delete current.matchStatus;
  delete current.removed;
  delete current.skipped;

  return {
    ...current,
    existingListingDecision:
      legacy.existingListingDecision === "create" ||
      legacy.existingListingDecision === "use-existing"
        ? legacy.existingListingDecision
        : null,
    linkProvenance,
    linkState,
    match,
    outputState,
    rowKind,
    suggestedMatch,
  } as CatalogImportRow;
}

function migrateDraft(value: unknown): CatalogImporterDraft | null {
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
    (draft.version !== 1 && draft.version !== 2) ||
    !Number.isInteger(draft.selectedSheetIndex) ||
    !mapping ||
    (parsedSpreadsheet !== null &&
      (typeof parsedSpreadsheet?.fileName !== "string" ||
        !Array.isArray(parsedSpreadsheet.sheets)))
  ) {
    return null;
  }

  const matchedRows = Array.isArray(draft.matchedRows)
    ? draft.matchedRows
        .map(migrateCatalogImportRow)
        .filter((row): row is CatalogImportRow => row !== null)
    : null;

  return {
    activeReviewRowId:
      typeof draft.activeReviewRowId === "string"
        ? draft.activeReviewRowId
        : null,
    headerRowIndex:
      typeof draft.headerRowIndex === "number" ? draft.headerRowIndex : null,
    mapping: {
      cultivarReferenceId:
        draft.version === 2 && typeof mapping.cultivarReferenceId === "number"
          ? mapping.cultivarReferenceId
          : null,
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
    version: 3,
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

    const draft = migrateDraft(JSON.parse(rawValue) as unknown);
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
      const normalizedDraft = normalizeCatalogImporterDraft(draft);
      await selectedStorage.set(
        CATALOG_IMPORT_DRAFT_STORAGE_KEY,
        normalizedDraft,
      );
      return normalizedDraft;
    }
    const migratedDraft = migrateDraft(draft);
    if (migratedDraft) {
      await selectedStorage.set(
        CATALOG_IMPORT_DRAFT_STORAGE_KEY,
        migratedDraft,
      );
      const normalizedDraft = normalizeCatalogImporterDraft(migratedDraft);
      await selectedStorage.set(
        CATALOG_IMPORT_DRAFT_STORAGE_KEY,
        normalizedDraft,
      );
      return normalizedDraft;
    }

    if (!storage) {
      const legacyDraft =
        await migrateLegacyCatalogImporterDraft(selectedStorage);
      if (legacyDraft) {
        return normalizeCatalogImporterDraft(legacyDraft);
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
