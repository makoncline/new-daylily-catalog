"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  cellToText,
  columnIndexToLabel,
  getCatalogImportMappedColumnLabel,
  getCatalogImportOrderedColumnIndexes,
  getCatalogImportState,
} from "@/lib/catalog-importer";
import type {
  CatalogColumnMapping,
  CatalogImportRow,
} from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  createCatalogImporterProjectId,
  serializeCatalogImporterSession,
  writeCatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import type {
  CatalogImporterDraft,
  CatalogImporterSession,
} from "@/lib/catalog-importer-draft";

export const EMPTY_CATALOG_IMPORT_MAPPING: CatalogColumnMapping = {
  cultivarReferenceId: null,
  description: null,
  price: null,
  privateNote: null,
  title: null,
};

export function useCatalogImporterSession(
  initialDraft: CatalogImporterDraft | null = null,
) {
  const restoredImportState = getCatalogImportState(
    initialDraft?.matchedRows ?? [],
  );
  const initialReviewedIssueActions = initialDraft?.reviewedIssueActions ?? [];
  const [session, setSession] = useState<CatalogImporterSession>(() => ({
    activeReviewRowId: initialDraft?.activeReviewRowId ?? null,
    headerRowIndex: initialDraft?.headerRowIndex ?? null,
    initialIssueCount:
      initialDraft?.initialIssueCount ??
      restoredImportState.counts.issueCount +
        restoredImportState.counts.warningCount,
    initialReviewCount:
      initialDraft?.initialReviewCount ??
      restoredImportState.counts.reviewQueueCount,
    mapping: initialDraft?.mapping ?? EMPTY_CATALOG_IMPORT_MAPPING,
    matchedRows: initialDraft?.matchedRows ?? null,
    matchedRowsKey: initialDraft?.matchedRowsKey ?? null,
    parsedSpreadsheet: initialDraft?.parsedSpreadsheet ?? null,
    projectId: initialDraft?.projectId ?? createCatalogImporterProjectId(),
    reviewedIssueActions: initialReviewedIssueActions,
    selectedSheetIndex: initialDraft?.selectedSheetIndex ?? 0,
  }));
  const sessionRef = useRef(session);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const draftWriteChain = useRef(Promise.resolve());
  const commitSession = useCallback(
    (updates: Partial<CatalogImporterSession> = {}) => {
      const nextSession = { ...sessionRef.current, ...updates };
      sessionRef.current = nextSession;
      setSession(nextSession);
      const draft = serializeCatalogImporterSession(nextSession);

      draftWriteChain.current = draftWriteChain.current.then(async () => {
        if (!draft.parsedSpreadsheet) {
          await clearCatalogImporterDraft();
          setStorageWarning(null);
          return;
        }

        const result = await writeCatalogImporterDraft(draft);
        setStorageWarning(
          result === "unavailable"
            ? "Browser progress could not be saved on this device."
            : null,
        );
      });

      return draftWriteChain.current;
    },
    [],
  );

  const resetSession = useCallback(() => {
    const nextProjectId = createCatalogImporterProjectId();
    void commitSession({
      activeReviewRowId: null,
      headerRowIndex: null,
      initialIssueCount: 0,
      initialReviewCount: 0,
      mapping: EMPTY_CATALOG_IMPORT_MAPPING,
      matchedRows: null,
      matchedRowsKey: null,
      parsedSpreadsheet: null,
      projectId: nextProjectId,
      reviewedIssueActions: [],
      selectedSheetIndex: 0,
    });
    setStorageWarning(null);
  }, [commitSession]);
  const flushDraft = useCallback(() => draftWriteChain.current, []);
  const { headerRowIndex, mapping, parsedSpreadsheet, selectedSheetIndex } =
    session;
  const selectedSheet = parsedSpreadsheet?.sheets[selectedSheetIndex] ?? null;
  const populatedSourceColumnIndexes = useMemo(() => {
    const indexes = new Set<number>();

    for (const row of selectedSheet?.rows ?? []) {
      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        if (cellToText(row[columnIndex])) {
          indexes.add(columnIndex);
        }
      }
    }

    return [...indexes].sort((left, right) => left - right);
  }, [selectedSheet]);
  const orderedSourceColumnIndexes = useMemo(
    () =>
      getCatalogImportOrderedColumnIndexes(
        mapping,
        populatedSourceColumnIndexes,
      ),
    [mapping, populatedSourceColumnIndexes],
  );
  const getSourceCellsForRow = useCallback(
    (row: CatalogImportRow) => {
      if (!selectedSheet) {
        return [];
      }

      const sourceRow = selectedSheet.rows[row.sourceRow - 1] ?? [];
      const headerRow =
        headerRowIndex === null ? null : selectedSheet.rows[headerRowIndex];

      return orderedSourceColumnIndexes.map((columnIndex) => {
        const column = columnIndexToLabel(columnIndex);
        const mappedLabel = getCatalogImportMappedColumnLabel(
          mapping,
          columnIndex,
        );

        return {
          column,
          mapped: mappedLabel !== null,
          label:
            mappedLabel ??
            ((headerRow ? cellToText(headerRow[columnIndex]) : "") ||
              `Column ${column}`),
          value: cellToText(sourceRow[columnIndex]),
        };
      });
    },
    [headerRowIndex, mapping, orderedSourceColumnIndexes, selectedSheet],
  );
  return {
    session,
    sessionRef,
    commitSession,
    resetSession,
    flushDraft,
    storageWarning,
    selectedSheet,
    getSourceCellsForRow,
  };
}
