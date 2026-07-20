"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import {
  CATALOG_IMPORT_MATCH_BATCH_SIZE,
  CATALOG_IMPORT_PREVIEW_ROW_COUNT,
} from "@/config/catalog-importer";
import {
  applyAutomaticCultivarMatches,
  assignCatalogImportDuplicateGroups,
  CATALOG_IMPORT_IMAGE_PREVIEW_WARNING_PREFIX,
  cellToText,
  columnIndexToLabel,
  createCatalogEnrichedSpreadsheet,
  createCatalogImportRows,
  createCatalogImportSampleSpreadsheet,
  createCatalogImportTemplateCsv,
  detectHeaderRow,
  getAutomaticCultivarMatch,
  getCatalogImportDownloadSummary,
  getCatalogImportState,
  getSourceColumns,
  isCatalogImportImagePreviewWarning,
  suggestColumnMapping,
} from "@/lib/catalog-importer";
import type {
  CatalogColumnMapping,
  CatalogImportRow,
  CultivarMatchCandidate,
  ParsedSpreadsheet,
} from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  writeCatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import {
  downloadCatalogImportFile,
  parseCatalogImportFile,
} from "@/lib/catalog-importer-file";
import { requestCultivarMatches } from "@/lib/catalog-importer-match-client";
import { getCultivarMatchConfidence } from "@/lib/cultivar-match-score";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import {
  getDownloadFileName,
  getErrorMessage,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type {
  CatalogImporterCandidateResult,
  CatalogImporterMappingField,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

const EMPTY_MAPPING: CatalogColumnMapping = {
  cultivarReferenceId: null,
  description: null,
  imageUrl: null,
  price: null,
  privateNote: null,
  title: null,
};

function getCatalogImportFileType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension === "csv" || extension === "xlsx" ? extension : "unknown";
}

function getCatalogImportTelemetryCounts(rows: CatalogImportRow[]) {
  const state = getCatalogImportState(rows);

  return {
    issue_count: state.counts.issueCount,
    matched_count: state.counts.linkedListingCount,
    review_count: state.counts.pendingCultivarDecisionCount,
    row_count: state.counts.includedListingCount,
  };
}

function captureIssueResolution({
  issueType,
  resolvedCount,
  rows,
}: {
  issueType: "duplicate" | "image" | "price" | "saved_id";
  resolvedCount: number;
  rows: CatalogImportRow[];
}) {
  capturePosthogEvent("catalog_import_issue_resolved", {
    issue_type: issueType,
    resolved_count: resolvedCount,
    ...getCatalogImportTelemetryCounts(rows),
  });
}

function appendOriginalPriceNote(privateNote: string, sourcePrice: string) {
  const note = `Original price: ${sourcePrice}`;
  if (privateNote.split("\n").includes(note)) {
    return privateNote;
  }

  return [privateNote, note].filter(Boolean).join("\n");
}

function getCatalogMatchKey({
  fileName,
  headerRowIndex,
  mapping,
  rowCount,
  sheetName,
}: {
  fileName: string | null;
  headerRowIndex: number | null;
  mapping: CatalogColumnMapping;
  rowCount: number;
  sheetName: string | null;
}) {
  return JSON.stringify({
    fileName,
    headerRowIndex,
    mapping,
    rowCount,
    sheetName,
  });
}

function downloadTextFile({
  contents,
  fileName,
}: {
  contents: string;
  fileName: string;
}) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getPopulatedColumnIndexes(
  rows: ParsedSpreadsheet["sheets"][number]["rows"],
) {
  const indexes = new Set<number>();
  for (const row of rows) {
    for (let index = 0; index < row.length; index += 1) {
      if (cellToText(row[index])) {
        indexes.add(index);
      }
    }
  }

  return [...indexes].sort((left, right) => left - right);
}

function removeRowFromDuplicateGroup(rows: CatalogImportRow[], rowId: string) {
  const removedRow = rows.find((row) => row.id === rowId);
  if (!removedRow) {
    return rows;
  }

  return assignCatalogImportDuplicateGroups(
    rows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            duplicateOfSourceRow: null,
            outputState: "removed",
          }
        : row,
    ),
  );
}

export function useCatalogImporterWorkbench(
  initialDraft: CatalogImporterDraft | null = null,
) {
  const restoredImportState = getCatalogImportState(
    initialDraft?.matchedRows ?? [],
  );
  const initialReviewRow =
    initialDraft?.matchedRows?.find(
      (row) =>
        row.id === initialDraft.activeReviewRowId &&
        row.rowKind === "listing" &&
        row.outputState === "included" &&
        row.cultivarReferenceIdWarning === null &&
        row.match === null &&
        row.linkState === "pending",
    ) ??
    initialDraft?.matchedRows?.find(
      (row) =>
        row.rowKind === "listing" &&
        row.outputState === "included" &&
        row.cultivarReferenceIdWarning === null &&
        row.match === null &&
        row.linkState === "pending",
    ) ??
    null;
  const [parsedSpreadsheet, setParsedSpreadsheet] =
    useState<ParsedSpreadsheet | null>(initialDraft?.parsedSpreadsheet ?? null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(
    initialDraft?.selectedSheetIndex ?? 0,
  );
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(
    initialDraft?.headerRowIndex ?? null,
  );
  const [mapping, setMapping] = useState<CatalogColumnMapping>(
    initialDraft?.mapping ?? EMPTY_MAPPING,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [downloadingResults, setDownloadingResults] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [matchedRows, setMatchedRows] = useState<CatalogImportRow[] | null>(
    initialDraft?.matchedRows ?? null,
  );
  const [matchedRowsKey, setMatchedRowsKey] = useState<string | null>(
    initialDraft?.matchedRowsKey ?? null,
  );
  const [initialReviewCount, setInitialReviewCount] = useState(
    initialDraft?.initialReviewCount ??
      restoredImportState.counts.reviewQueueCount,
  );
  const [initialIssueCount, setInitialIssueCount] = useState(
    initialDraft?.initialIssueCount ??
      restoredImportState.counts.issueCount +
        restoredImportState.counts.warningCount,
  );
  const [matchingProgress, setMatchingProgress] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const [processingStage, setProcessingStage] = useState<
    "building" | "detecting" | "matching" | null
  >(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [activeReviewRowId, setActiveReviewRowId] = useState<string | null>(
    initialDraft?.activeReviewRowId ?? null,
  );
  const [reviewQuery, setReviewQuery] = useState("");
  const [candidateResult, setCandidateResult] =
    useState<CatalogImporterCandidateResult | null>(() =>
      initialReviewRow
        ? {
            candidates: initialReviewRow.suggestedMatch
              ? [initialReviewRow.suggestedMatch]
              : [],
            error: null,
            loading: false,
            query: initialReviewRow.title,
            rowId: initialReviewRow.id,
          }
        : null,
    );
  const [searchCandidateResult, setSearchCandidateResult] =
    useState<CatalogImporterCandidateResult | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [lastLinkAction, setLastLinkAction] = useState<{
    displayName: string;
    kind: "added" | "changed" | "excluded" | "left-unmatched";
    previousRow: CatalogImportRow;
    rowId: string;
  } | null>(null);
  const [lastIssueAction, setLastIssueAction] = useState<{
    message: string;
    previousRows: CatalogImportRow[];
  } | null>(null);
  const exactMatchRequestId = useRef(0);
  const exactMatchAbortController = useRef<AbortController | null>(null);
  const closeCandidateRequestId = useRef(0);
  const searchCandidateRequestId = useRef(0);
  const draftWriteChain = useRef(Promise.resolve());
  const identityDecisionTracked = useRef(false);
  const previewTracked = useRef(initialDraft?.matchedRows != null);

  const selectedSheet = parsedSpreadsheet?.sheets[selectedSheetIndex] ?? null;
  const sourceColumns = useMemo(
    () =>
      selectedSheet ? getSourceColumns(selectedSheet.rows, headerRowIndex) : [],
    [headerRowIndex, selectedSheet],
  );
  const sourcePreviewRows =
    selectedSheet?.rows.slice(0, CATALOG_IMPORT_PREVIEW_ROW_COUNT) ?? [];
  const sourcePreviewColumnIndexes =
    getPopulatedColumnIndexes(sourcePreviewRows);
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
  const getSourceCellsForRow = useCallback(
    (row: CatalogImportRow) => {
      if (!selectedSheet) {
        return [];
      }

      const sourceRow = selectedSheet.rows[row.sourceRow - 1] ?? [];
      const headerRow =
        headerRowIndex === null ? null : selectedSheet.rows[headerRowIndex];

      return populatedSourceColumnIndexes.map((columnIndex) => {
        const column = columnIndexToLabel(columnIndex);

        return {
          column,
          label:
            (headerRow ? cellToText(headerRow[columnIndex]) : "") ||
            `Column ${column}`,
          value: cellToText(sourceRow[columnIndex]),
        };
      });
    },
    [headerRowIndex, populatedSourceColumnIndexes, selectedSheet],
  );
  const importState = useMemo(
    () =>
      getCatalogImportState(matchedRows ?? [], selectedSheet?.rows.length ?? 0),
    [matchedRows, selectedSheet?.rows.length],
  );
  const downloadSummary = useMemo(
    () =>
      parsedSpreadsheet && matchedRows
        ? getCatalogImportDownloadSummary({
            matchedRows,
            parsedSpreadsheet,
          })
        : null,
    [matchedRows, parsedSpreadsheet],
  );
  const { includedRows, reviewRows } = importState;
  const activeReviewRow =
    reviewRows.find((row) => row.id === activeReviewRowId) ??
    reviewRows[0] ??
    null;
  const activeReviewSourceCells = useMemo(() => {
    if (!activeReviewRow) {
      return [];
    }

    return getSourceCellsForRow(activeReviewRow);
  }, [activeReviewRow, getSourceCellsForRow]);
  const matchedCount = importState.counts.linkedListingCount;
  const unmatchedCount = importState.counts.intentionallyUnmatchedCount;
  const issueCount = importState.counts.issueCount;
  const remainingIssueCount =
    importState.counts.issueCount + importState.counts.warningCount;
  const issueProgressTotal = Math.max(initialIssueCount, remainingIssueCount);
  const reviewProgressTotal = Math.max(initialReviewCount, reviewRows.length);
  const completedIssueCount = Math.max(
    0,
    issueProgressTotal - remainingIssueCount,
  );
  const completedReviewCount = Math.max(
    0,
    reviewProgressTotal - reviewRows.length,
  );
  const activeReviewIndex = activeReviewRow
    ? reviewRows.findIndex((row) => row.id === activeReviewRow.id)
    : -1;

  const loadCandidates = useCallback(async (row: CatalogImportRow) => {
    const requestId = closeCandidateRequestId.current + 1;
    closeCandidateRequestId.current = requestId;
    setCandidateResult({
      candidates: [],
      error: null,
      loading: true,
      query: row.title,
      rowId: row.id,
    });

    try {
      const [result] = await requestCultivarMatches({
        includeCandidates: true,
        names: [row.title],
      });
      if (closeCandidateRequestId.current !== requestId) {
        return;
      }

      setCandidateResult({
        candidates: result?.candidates ?? [],
        error: null,
        loading: false,
        query: row.title,
        rowId: row.id,
      });
    } catch (error) {
      if (closeCandidateRequestId.current !== requestId) {
        return;
      }

      setCandidateResult({
        candidates: [],
        error: getErrorMessage(error),
        loading: false,
        query: row.title,
        rowId: row.id,
      });
    }
  }, []);

  const persistDraft = useCallback(
    (overrides: Partial<Omit<CatalogImporterDraft, "version">> = {}) => {
      const draft: CatalogImporterDraft = {
        activeReviewRowId,
        headerRowIndex,
        initialIssueCount,
        initialReviewCount,
        mapping,
        matchedRows,
        matchedRowsKey,
        parsedSpreadsheet,
        selectedSheetIndex,
        ...overrides,
        version: 3,
      };

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
    [
      activeReviewRowId,
      headerRowIndex,
      initialIssueCount,
      initialReviewCount,
      mapping,
      matchedRows,
      matchedRowsKey,
      parsedSpreadsheet,
      selectedSheetIndex,
    ],
  );

  const saveMatchedRows = useCallback(
    (
      nextRows: CatalogImportRow[],
      nextActiveReviewRowId = activeReviewRowId,
    ) => {
      const nextImportState = getCatalogImportState(nextRows);
      const nextInitialIssueCount = Math.max(
        initialIssueCount,
        nextImportState.counts.issueCount + nextImportState.counts.warningCount,
      );
      const nextInitialReviewCount = Math.max(
        initialReviewCount,
        nextImportState.reviewRows.length,
      );
      setLastLinkAction(null);
      setLastIssueAction(null);
      setMatchedRows(nextRows);
      setInitialIssueCount(nextInitialIssueCount);
      setInitialReviewCount(nextInitialReviewCount);
      void persistDraft({
        activeReviewRowId: nextActiveReviewRowId,
        initialIssueCount: nextInitialIssueCount,
        initialReviewCount: nextInitialReviewCount,
        matchedRows: nextRows,
      });
    },
    [activeReviewRowId, initialIssueCount, initialReviewCount, persistDraft],
  );

  const matchSpreadsheet = useCallback(
    async ({
      headerRowIndex: nextHeaderRowIndex,
      mapping: nextMapping,
      selectedSheetIndex: nextSheetIndex,
      spreadsheet,
    }: {
      headerRowIndex: number | null;
      mapping: CatalogColumnMapping;
      selectedSheetIndex: number;
      spreadsheet: ParsedSpreadsheet;
    }) => {
      const sheet = spreadsheet.sheets[nextSheetIndex];
      if (!sheet || nextMapping.title === null) {
        setMatchedRows(null);
        setMatchedRowsKey(null);
        setInitialIssueCount(0);
        setInitialReviewCount(0);
        setMatchingProgress(null);
        setProcessingStage(null);
        await persistDraft({
          activeReviewRowId: null,
          headerRowIndex: nextHeaderRowIndex,
          initialIssueCount: 0,
          initialReviewCount: 0,
          mapping: nextMapping,
          matchedRows: null,
          matchedRowsKey: null,
          parsedSpreadsheet: spreadsheet,
          selectedSheetIndex: nextSheetIndex,
        });
        return;
      }

      setProcessingStage("detecting");
      const rows = createCatalogImportRows({
        headerRowIndex: nextHeaderRowIndex,
        mapping: nextMapping,
        rows: sheet.rows,
      });
      const rowsToMatch = rows.filter(
        (row) => row.rowKind === "listing" && row.outputState === "included",
      );
      if (rowsToMatch.length === 0) {
        const nextImportState = getCatalogImportState(rows);
        const nextIssueCount =
          nextImportState.counts.issueCount +
          nextImportState.counts.warningCount;
        const nextReviewCount = nextImportState.counts.reviewQueueCount;
        setMatchedRows(rows);
        setMatchedRowsKey(null);
        setInitialIssueCount(nextIssueCount);
        setInitialReviewCount(nextReviewCount);
        setMatchingProgress(null);
        await persistDraft({
          activeReviewRowId: null,
          headerRowIndex: nextHeaderRowIndex,
          initialIssueCount: nextIssueCount,
          initialReviewCount: nextReviewCount,
          mapping: nextMapping,
          matchedRows: rows,
          matchedRowsKey: null,
          parsedSpreadsheet: spreadsheet,
          selectedSheetIndex: nextSheetIndex,
        });
        setProcessingStage(null);
        return;
      }

      const uniqueInputs = [
        ...new Map(
          rowsToMatch.map((row) => [
            row.sourceCultivarReferenceId
              ? `id:${row.sourceCultivarReferenceId}`
              : `name:${normalizeCultivarName(row.title) ?? row.title}`,
            {
              cultivarReferenceId: row.sourceCultivarReferenceId || null,
              name: row.title,
            },
          ]),
        ).values(),
      ];
      const nextMatchKey = getCatalogMatchKey({
        fileName: spreadsheet.fileName,
        headerRowIndex: nextHeaderRowIndex,
        mapping: nextMapping,
        rowCount: sheet.rows.length,
        sheetName: sheet.name,
      });
      const requestId = exactMatchRequestId.current + 1;
      const controller = new AbortController();
      exactMatchRequestId.current = requestId;
      exactMatchAbortController.current?.abort();
      exactMatchAbortController.current = controller;
      setMatchedRows(null);
      setMatchedRowsKey(null);
      setInitialIssueCount(0);
      setInitialReviewCount(0);
      setMatchError(null);
      setMatchingProgress(null);
      setActiveReviewRowId(null);
      setReviewQuery("");
      closeCandidateRequestId.current += 1;
      setCandidateResult(null);
      setSearchCandidateResult(null);

      await persistDraft({
        activeReviewRowId: null,
        headerRowIndex: nextHeaderRowIndex,
        initialIssueCount: 0,
        initialReviewCount: 0,
        mapping: nextMapping,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet: spreadsheet,
        selectedSheetIndex: nextSheetIndex,
      });
      if (exactMatchRequestId.current !== requestId) {
        return;
      }

      setProcessingStage("matching");
      setMatchingProgress({ processed: 0, total: uniqueInputs.length });
      const automaticMatches = new Map<string, CultivarMatchCandidate>();
      const cultivarReferenceMatches = new Map<
        string,
        CultivarMatchCandidate
      >();
      const invalidCultivarReferenceIds = new Set<string>();
      const suggestedMatches = new Map<string, CultivarMatchCandidate>();

      try {
        for (
          let start = 0;
          start < uniqueInputs.length;
          start += CATALOG_IMPORT_MATCH_BATCH_SIZE
        ) {
          const batch = uniqueInputs.slice(
            start,
            start + CATALOG_IMPORT_MATCH_BATCH_SIZE,
          );
          const results = await requestCultivarMatches({
            cultivarReferenceIds: batch.map(
              (input) => input.cultivarReferenceId,
            ),
            includeCandidates: true,
            names: batch.map((input) => input.name),
            signal: controller.signal,
          });

          if (exactMatchRequestId.current !== requestId) {
            return;
          }

          for (const result of results) {
            if (result.inputCultivarReferenceId) {
              if (result.exactMatch) {
                cultivarReferenceMatches.set(
                  result.inputCultivarReferenceId,
                  result.exactMatch,
                );
              } else if (result.invalidCultivarReferenceId) {
                invalidCultivarReferenceIds.add(
                  result.invalidCultivarReferenceId,
                );
              }
              continue;
            }

            const automaticMatch = getAutomaticCultivarMatch(result);
            const suggestedMatch = result.candidates[0];
            if (result.normalizedInput && suggestedMatch) {
              suggestedMatches.set(result.normalizedInput, suggestedMatch);
            }
            if (result.normalizedInput && automaticMatch) {
              automaticMatches.set(result.normalizedInput, automaticMatch);
            }
          }

          setMatchingProgress({
            processed: Math.min(start + batch.length, uniqueInputs.length),
            total: uniqueInputs.length,
          });
        }

        const nextRows = applyAutomaticCultivarMatches({
          automaticMatches,
          cultivarReferenceMatches,
          invalidCultivarReferenceIds,
          rows,
          suggestedMatches,
        });

        if (exactMatchRequestId.current !== requestId) {
          return;
        }

        const nextImportState = getCatalogImportState(nextRows);
        const nextReviewRow = nextImportState.reviewRows[0] ?? null;
        const nextIssueCount =
          nextImportState.counts.issueCount +
          nextImportState.counts.warningCount;
        const nextReviewCount = nextImportState.counts.reviewQueueCount;
        setProcessingStage("building");
        setMatchingProgress(null);
        await persistDraft({
          activeReviewRowId: nextReviewRow?.id ?? null,
          headerRowIndex: nextHeaderRowIndex,
          initialIssueCount: nextIssueCount,
          initialReviewCount: nextReviewCount,
          mapping: nextMapping,
          matchedRows: nextRows,
          matchedRowsKey: nextMatchKey,
          parsedSpreadsheet: spreadsheet,
          selectedSheetIndex: nextSheetIndex,
        });
        if (exactMatchRequestId.current !== requestId) {
          return;
        }

        setMatchedRows(nextRows);
        setMatchedRowsKey(nextMatchKey);
        setInitialIssueCount(nextIssueCount);
        setInitialReviewCount(nextReviewCount);
        setActiveReviewRowId(nextReviewRow?.id ?? null);
        setReviewQuery(nextReviewRow?.sourceTitle ?? "");
        setProcessingStage(null);
        setMatchingProgress(null);
        globalThis.requestAnimationFrame?.(() => {
          globalThis.requestAnimationFrame?.(() => {
            document
              .getElementById("catalog-importer-summary")
              ?.scrollIntoView?.({ block: "start" });
          });
        });
        if (!previewTracked.current) {
          previewTracked.current = true;
          capturePosthogEvent("catalog_import_previewed", {
            file_type: getCatalogImportFileType(spreadsheet.fileName),
            sheet_count: spreadsheet.sheets.length,
            ...getCatalogImportTelemetryCounts(nextRows),
          });
        }
        if (nextReviewRow) {
          void loadCandidates(nextReviewRow);
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          exactMatchRequestId.current !== requestId
        ) {
          return;
        }

        setMatchError(getErrorMessage(error));
        setProcessingStage(null);
        setMatchingProgress(null);
      }
    },
    [loadCandidates, persistDraft],
  );

  const buildCatalogPreview = useCallback(() => {
    if (!parsedSpreadsheet) {
      return;
    }

    void matchSpreadsheet({
      headerRowIndex,
      mapping,
      selectedSheetIndex,
      spreadsheet: parsedSpreadsheet,
    });
  }, [
    headerRowIndex,
    mapping,
    matchSpreadsheet,
    parsedSpreadsheet,
    selectedSheetIndex,
  ]);

  const resetMatches = useCallback(() => {
    exactMatchRequestId.current += 1;
    exactMatchAbortController.current?.abort();
    exactMatchAbortController.current = null;
    closeCandidateRequestId.current += 1;
    searchCandidateRequestId.current += 1;
    setMatchedRows(null);
    setMatchedRowsKey(null);
    setInitialIssueCount(0);
    setInitialReviewCount(0);
    setMatchingProgress(null);
    setProcessingStage(null);
    setMatchError(null);
    setActiveReviewRowId(null);
    setReviewQuery("");
    setCandidateResult(null);
    setSearchCandidateResult(null);
    setLastLinkAction(null);
  }, []);

  const resetImporter = useCallback(() => {
    void persistDraft({
      activeReviewRowId: null,
      headerRowIndex: null,
      initialIssueCount: 0,
      initialReviewCount: 0,
      mapping: EMPTY_MAPPING,
      matchedRows: null,
      matchedRowsKey: null,
      parsedSpreadsheet: null,
      selectedSheetIndex: 0,
    });
    setParsedSpreadsheet(null);
    setSelectedSheetIndex(0);
    setHeaderRowIndex(null);
    setMapping(EMPTY_MAPPING);
    setFileError(null);
    setReadingFile(false);
    setDownloadError(null);
    resetMatches();
    setStorageWarning(null);
    setLiveAnnouncement("Local progress cleared.");
    previewTracked.current = false;
  }, [persistDraft, resetMatches]);

  const configureSheet = useCallback(
    (spreadsheet: ParsedSpreadsheet, sheetIndex: number) => {
      const sheet = spreadsheet.sheets[sheetIndex];
      if (!sheet) {
        return;
      }

      const nextHeaderRowIndex = detectHeaderRow(sheet.rows);
      const nextColumns = getSourceColumns(sheet.rows, nextHeaderRowIndex);
      const nextMapping = suggestColumnMapping(
        sheet.rows,
        nextHeaderRowIndex,
        nextColumns,
      );

      setSelectedSheetIndex(sheetIndex);
      setHeaderRowIndex(nextHeaderRowIndex);
      setMapping(nextMapping);
      resetMatches();
      void persistDraft({
        activeReviewRowId: null,
        headerRowIndex: nextHeaderRowIndex,
        initialIssueCount: 0,
        initialReviewCount: 0,
        mapping: nextMapping,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet: spreadsheet,
        selectedSheetIndex: sheetIndex,
      });
    },
    [persistDraft, resetMatches],
  );

  const loadFile = useCallback(
    async (file: File) => {
      setReadingFile(true);
      setFileError(null);
      identityDecisionTracked.current = false;
      capturePosthogEvent("catalog_import_started", {
        file_type: getCatalogImportFileType(file.name),
        source: "upload",
      });

      try {
        const spreadsheet = await parseCatalogImportFile(file);
        previewTracked.current = false;
        capturePosthogEvent("catalog_import_uploaded", {
          file_type: getCatalogImportFileType(spreadsheet.fileName),
          row_count: spreadsheet.sheets.reduce(
            (total, sheet) => total + sheet.rows.length,
            0,
          ),
          sheet_count: spreadsheet.sheets.length,
          source: "upload",
        });
        setParsedSpreadsheet(spreadsheet);
        configureSheet(spreadsheet, 0);
        setLiveAnnouncement(
          `${spreadsheet.fileName} loaded with ${spreadsheet.sheets.length.toLocaleString()} sheet${spreadsheet.sheets.length === 1 ? "" : "s"}.`,
        );
      } catch (error) {
        setFileError(getErrorMessage(error));
      } finally {
        setReadingFile(false);
      }
    },
    [configureSheet],
  );

  const loadSampleCatalog = useCallback(() => {
    const spreadsheet = createCatalogImportSampleSpreadsheet();
    identityDecisionTracked.current = false;
    previewTracked.current = false;
    capturePosthogEvent("catalog_import_started", {
      file_type: getCatalogImportFileType(spreadsheet.fileName),
      source: "sample",
    });
    capturePosthogEvent("catalog_import_uploaded", {
      file_type: getCatalogImportFileType(spreadsheet.fileName),
      row_count: spreadsheet.sheets.reduce(
        (total, sheet) => total + sheet.rows.length,
        0,
      ),
      sheet_count: spreadsheet.sheets.length,
      source: "sample",
    });
    setFileError(null);
    setParsedSpreadsheet(spreadsheet);
    configureSheet(spreadsheet, 0);
    setLiveAnnouncement("Sample daylily catalog loaded.");
  }, [configureSheet]);

  const rejectFile = useCallback((message: string) => {
    setFileError(message);
    setLiveAnnouncement(message);
  }, []);

  const handleHeaderChange = useCallback(
    (value: string) => {
      if (!selectedSheet) {
        return;
      }

      const nextHeaderRowIndex = value === "none" ? null : Number(value);
      const nextColumns = getSourceColumns(
        selectedSheet.rows,
        nextHeaderRowIndex,
      );
      const nextMapping = suggestColumnMapping(
        selectedSheet.rows,
        nextHeaderRowIndex,
        nextColumns,
      );

      setHeaderRowIndex(nextHeaderRowIndex);
      setMapping(nextMapping);
      resetMatches();
      void persistDraft({
        activeReviewRowId: null,
        headerRowIndex: nextHeaderRowIndex,
        initialIssueCount: 0,
        initialReviewCount: 0,
        mapping: nextMapping,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet,
        selectedSheetIndex,
      });
    },
    [
      parsedSpreadsheet,
      persistDraft,
      resetMatches,
      selectedSheet,
      selectedSheetIndex,
    ],
  );

  const handleMappingChange = useCallback(
    (field: CatalogImporterMappingField, value: number | null) => {
      if (!parsedSpreadsheet) {
        return;
      }

      const nextMapping = {
        ...mapping,
        [field]: value,
      };
      setMapping(nextMapping);
      resetMatches();
      void persistDraft({
        activeReviewRowId: null,
        headerRowIndex,
        initialIssueCount: 0,
        initialReviewCount: 0,
        mapping: nextMapping,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet,
        selectedSheetIndex,
      });
    },
    [
      headerRowIndex,
      mapping,
      parsedSpreadsheet,
      persistDraft,
      resetMatches,
      selectedSheetIndex,
    ],
  );

  const searchCandidates = useCallback(
    async (row: CatalogImportRow, query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return;
      }

      const requestId = searchCandidateRequestId.current + 1;
      searchCandidateRequestId.current = requestId;
      setSearchCandidateResult({
        candidates: [],
        error: null,
        loading: true,
        query: trimmedQuery,
        rowId: row.id,
      });

      try {
        const [result] = await requestCultivarMatches({
          includeCandidates: true,
          names: [trimmedQuery],
        });
        if (searchCandidateRequestId.current !== requestId) {
          return;
        }

        setSearchCandidateResult({
          candidates: result?.candidates ?? [],
          error: null,
          loading: false,
          query: trimmedQuery,
          rowId: row.id,
        });
      } catch (error) {
        if (searchCandidateRequestId.current !== requestId) {
          return;
        }

        setSearchCandidateResult({
          candidates: [],
          error: getErrorMessage(error),
          loading: false,
          query: trimmedQuery,
          rowId: row.id,
        });
      }
    },
    [],
  );

  const resetCandidateSearch = useCallback((row: CatalogImportRow) => {
    searchCandidateRequestId.current += 1;
    setReviewQuery(row.sourceTitle);
    setSearchCandidateResult(null);
  }, []);

  const openReviewRow = useCallback(
    (row: CatalogImportRow) => {
      searchCandidateRequestId.current += 1;
      setActiveReviewRowId(row.id);
      setReviewQuery(row.sourceTitle);
      void loadCandidates(row);
      setSearchCandidateResult(null);
      setLiveAnnouncement(
        `Reviewing source row ${row.sourceRow}: ${row.title}.`,
      );
      void persistDraft({ activeReviewRowId: row.id });
    },
    [loadCandidates, persistDraft],
  );

  const moveReviewRow = useCallback(
    (direction: -1 | 1) => {
      if (reviewRows.length === 0) {
        return;
      }

      const currentIndex = Math.max(
        0,
        reviewRows.findIndex((row) => row.id === activeReviewRowId),
      );
      const nextIndex =
        (currentIndex + direction + reviewRows.length) % reviewRows.length;
      const nextRow = reviewRows[nextIndex];
      if (nextRow) {
        openReviewRow(nextRow);
      }
    },
    [activeReviewRowId, openReviewRow, reviewRows],
  );

  const finishReviewRow = useCallback(
    (
      rowId: string,
      update: Pick<CatalogImportRow, "linkProvenance" | "linkState" | "match"> &
        Partial<Pick<CatalogImportRow, "outputState">>,
    ) => {
      if (!matchedRows) {
        return;
      }

      const reviewedRow = matchedRows.find((row) => row.id === rowId);
      const normalizedUpdate =
        reviewedRow && update.match
          ? {
              ...update,
              match: {
                ...update.match,
                confidence: getCultivarMatchConfidence(
                  reviewedRow.title,
                  update.match.displayName,
                ),
              },
            }
          : update;
      const nextRows = assignCatalogImportDuplicateGroups(
        matchedRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                ...normalizedUpdate,
                duplicateAccepted: normalizedUpdate.match
                  ? false
                  : row.duplicateAccepted,
              }
            : row,
        ),
      );
      const previousReviewRows = getCatalogImportState(matchedRows).reviewRows;
      const reviewedIndex = Math.max(
        0,
        previousReviewRows.findIndex((row) => row.id === rowId),
      );
      const nextReviewRows = getCatalogImportState(nextRows).reviewRows;
      const excluded = normalizedUpdate.outputState === "removed";
      const nextReviewRow =
        nextReviewRows[reviewedIndex % Math.max(nextReviewRows.length, 1)] ??
        null;
      capturePosthogEvent("catalog_import_identity_decided", {
        decision_state: excluded
          ? "excluded"
          : normalizedUpdate.match
            ? "linked"
            : "unmatched",
        first_decision: !identityDecisionTracked.current,
        final_decision: nextReviewRows.length === 0,
        remaining_count: nextReviewRows.length,
        ...getCatalogImportTelemetryCounts(nextRows),
      });
      identityDecisionTracked.current = true;

      searchCandidateRequestId.current += 1;
      setSearchCandidateResult(null);

      const action = excluded
        ? "excluded from the catalog"
        : update.match
          ? `matched to ${update.match.displayName}`
          : "left unmatched";

      if (nextReviewRow) {
        setLiveAnnouncement(
          `${reviewedRow?.title ?? "Row"} ${action}. Moving to ${nextReviewRow.title}.`,
        );
        setActiveReviewRowId(nextReviewRow.id);
        setReviewQuery(nextReviewRow.sourceTitle);
        void loadCandidates(nextReviewRow);
      } else {
        closeCandidateRequestId.current += 1;
        setCandidateResult(null);
        setActiveReviewRowId(null);
        setReviewQuery("");
        setLiveAnnouncement(
          `${reviewedRow?.title ?? "Row"} ${action}. Manual review is complete.`,
        );
      }
      saveMatchedRows(nextRows, nextReviewRow?.id ?? null);
      if (reviewedRow) {
        setLastLinkAction({
          displayName: normalizedUpdate.match?.displayName ?? reviewedRow.title,
          kind: excluded
            ? "excluded"
            : normalizedUpdate.match
              ? reviewedRow.linkState === "linked" && reviewedRow.match
                ? "changed"
                : "added"
              : "left-unmatched",
          previousRow: reviewedRow,
          rowId,
        });
      }
    },
    [loadCandidates, matchedRows, saveMatchedRows],
  );

  const skipReviewRow = useCallback(() => {
    if (!activeReviewRow) {
      return;
    }

    finishReviewRow(activeReviewRow.id, {
      linkProvenance: null,
      linkState: "intentionally-unmatched",
      match: null,
    });
  }, [activeReviewRow, finishReviewRow]);

  const excludeReviewRow = useCallback(() => {
    if (!activeReviewRow) {
      return;
    }

    finishReviewRow(activeReviewRow.id, {
      linkProvenance: null,
      linkState: "pending",
      match: null,
      outputState: "removed",
    });
  }, [activeReviewRow, finishReviewRow]);

  const leaveRowUnmatched = useCallback(
    (rowId: string) => {
      if (!matchedRows) {
        return;
      }

      const previousRow = matchedRows.find((row) => row.id === rowId);
      if (!previousRow) {
        return;
      }

      const nextRows = assignCatalogImportDuplicateGroups(
        matchedRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                linkProvenance: null,
                linkState: "intentionally-unmatched" as const,
                match: null,
              }
            : row,
        ),
      );
      saveMatchedRows(nextRows);
      setLastLinkAction({
        displayName: previousRow.title,
        kind: "left-unmatched",
        previousRow,
        rowId,
      });
      setLiveAnnouncement(
        `${previousRow.title} will remain unmatched in the prepared workbook.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const restoreUnmatchedRow = useCallback(
    (rowId: string) => {
      if (!matchedRows) {
        return;
      }

      const previousRow = matchedRows.find((row) => row.id === rowId);
      if (previousRow?.linkState !== "intentionally-unmatched") {
        return;
      }

      const restoredRow: CatalogImportRow = {
        ...previousRow,
        linkProvenance: null,
        linkState: "pending",
        match: null,
      };
      const nextRows = assignCatalogImportDuplicateGroups(
        matchedRows.map((row) => (row.id === rowId ? restoredRow : row)),
      );

      searchCandidateRequestId.current += 1;
      setSearchCandidateResult(null);
      setActiveReviewRowId(rowId);
      setReviewQuery(restoredRow.sourceTitle);
      void loadCandidates(restoredRow);
      setLiveAnnouncement(`${restoredRow.title} returned to manual review.`);
      saveMatchedRows(nextRows, rowId);
    },
    [loadCandidates, matchedRows, saveMatchedRows],
  );

  const selectRowMatch = useCallback(
    (rowId: string, match: CultivarMatchCandidate) => {
      if (!matchedRows) {
        return;
      }
      const previousRow = matchedRows.find((row) => row.id === rowId);
      if (!previousRow) {
        return;
      }

      const nextRows = assignCatalogImportDuplicateGroups(
        matchedRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                match: {
                  ...match,
                  confidence: getCultivarMatchConfidence(
                    row.title,
                    match.displayName,
                  ),
                },
                duplicateAccepted: false,
                linkProvenance: "user-confirmed",
                linkState: "linked",
              }
            : row,
        ),
      );
      saveMatchedRows(nextRows);
      setLastLinkAction({
        displayName: match.displayName,
        kind:
          previousRow.linkState === "linked" && previousRow.match
            ? "changed"
            : "added",
        previousRow,
        rowId,
      });
      setLiveAnnouncement(`Match changed to ${match.displayName}.`);
    },
    [matchedRows, saveMatchedRows],
  );

  const undoLastLinkAction = useCallback(() => {
    if (!lastLinkAction || !matchedRows) {
      return;
    }

    const nextRows = assignCatalogImportDuplicateGroups(
      matchedRows.map((row) =>
        row.id === lastLinkAction.rowId ? lastLinkAction.previousRow : row,
      ),
    );
    const restoredReviewRow =
      lastLinkAction.previousRow.linkState === "pending"
        ? lastLinkAction.previousRow
        : null;
    if (restoredReviewRow) {
      searchCandidateRequestId.current += 1;
      setSearchCandidateResult(null);
      setActiveReviewRowId(restoredReviewRow.id);
      setReviewQuery(restoredReviewRow.sourceTitle);
      void loadCandidates(restoredReviewRow);
    }
    saveMatchedRows(nextRows, restoredReviewRow?.id);
    setLiveAnnouncement(
      `${lastLinkAction.displayName} identity decision undone.`,
    );
  }, [lastLinkAction, loadCandidates, matchedRows, saveMatchedRows]);

  const removeDuplicateRow = useCallback(
    (rowId: string) => {
      if (!matchedRows) {
        return;
      }
      const removedRow = matchedRows.find((row) => row.id === rowId);
      if (!removedRow) {
        return;
      }

      const nextRows = removeRowFromDuplicateGroup(matchedRows, rowId);
      saveMatchedRows(nextRows);
      captureIssueResolution({
        issueType: "duplicate",
        resolvedCount: 1,
        rows: nextRows,
      });
      setLastIssueAction({
        message: `Source row ${removedRow.sourceRow} was removed from the prepared workbook.`,
        previousRows: matchedRows,
      });
      setLiveAnnouncement(`Source row ${removedRow.sourceRow} removed.`);
    },
    [matchedRows, saveMatchedRows],
  );

  const keepDuplicateRows = useCallback(
    (rowIds: string[]) => {
      const retainedIds = new Set(rowIds);
      if (retainedIds.size === 0 || !matchedRows) {
        return;
      }

      const nextRows = matchedRows.map((row) =>
        retainedIds.has(row.id)
          ? {
              ...row,
              duplicateAccepted: true,
              duplicateOfSourceRow: null,
            }
          : row,
      );
      saveMatchedRows(nextRows);
      captureIssueResolution({
        issueType: "duplicate",
        resolvedCount: retainedIds.size,
        rows: nextRows,
      });
      setLastIssueAction({
        message: `${retainedIds.size.toLocaleString()} intentional listings were kept.`,
        previousRows: matchedRows,
      });
      setLiveAnnouncement(
        `${retainedIds.size.toLocaleString()} duplicate listings kept.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const excludeDuplicateRows = useCallback(
    (rowIds: string[]) => {
      const excludedIds = new Set(rowIds);
      if (excludedIds.size === 0 || !matchedRows) {
        return;
      }

      const nextRows = assignCatalogImportDuplicateGroups(
        matchedRows.map((row) =>
          excludedIds.has(row.id)
            ? {
                ...row,
                duplicateOfSourceRow: null,
                outputState: "removed",
              }
            : row,
        ),
      );
      saveMatchedRows(nextRows);
      captureIssueResolution({
        issueType: "duplicate",
        resolvedCount: excludedIds.size,
        rows: nextRows,
      });
      setLastIssueAction({
        message: `${excludedIds.size.toLocaleString()} listings were excluded from the prepared workbook.`,
        previousRows: matchedRows,
      });
      setLiveAnnouncement(
        `${excludedIds.size.toLocaleString()} duplicate listings excluded.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const resolvePriceIssues = useCallback(
    (
      updates: Array<{
        preserveOriginalOffer?: boolean;
        price: number | null;
        rowId: string;
      }>,
    ) => {
      if (!matchedRows) {
        return;
      }
      const prices = new Map(updates.map((update) => [update.rowId, update]));
      if (prices.size === 0) {
        return;
      }

      const nextRows = matchedRows.map((row) =>
        prices.has(row.id)
          ? {
              ...row,
              price: prices.get(row.id)?.price ?? null,
              priceWarning: null,
              privateNote: prices.get(row.id)?.preserveOriginalOffer
                ? appendOriginalPriceNote(row.privateNote, row.sourcePrice)
                : row.privateNote,
            }
          : row,
      );
      saveMatchedRows(nextRows);
      captureIssueResolution({
        issueType: "price",
        resolvedCount: prices.size,
        rows: nextRows,
      });
      setLastIssueAction({
        message: `${prices.size.toLocaleString()} price ${prices.size === 1 ? "value was" : "values were"} updated.`,
        previousRows: matchedRows,
      });
      setLiveAnnouncement(
        `${prices.size.toLocaleString()} price ${prices.size === 1 ? "issue" : "issues"} resolved.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const resolveImageUrlIssues = useCallback(
    (updates: Array<{ imageUrl: string; rowId: string }>) => {
      if (!matchedRows) {
        return;
      }
      const imageUrls = new Map(
        updates.map(({ imageUrl, rowId }) => [rowId, imageUrl]),
      );
      if (imageUrls.size === 0) {
        return;
      }

      const nextRows = matchedRows.map((row) =>
        imageUrls.has(row.id)
          ? {
              ...row,
              imageUrl: imageUrls.get(row.id) ?? "",
              imagePreviewAccepted: false,
              imageUrlWarning: null,
            }
          : row,
      );
      saveMatchedRows(nextRows);
      captureIssueResolution({
        issueType: "image",
        resolvedCount: imageUrls.size,
        rows: nextRows,
      });
      setLastIssueAction({
        message: `${imageUrls.size.toLocaleString()} seller image ${imageUrls.size === 1 ? "value was" : "values were"} updated.`,
        previousRows: matchedRows,
      });
      setLiveAnnouncement(
        `${imageUrls.size.toLocaleString()} image URL ${imageUrls.size === 1 ? "issue" : "issues"} resolved.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const flagImageUrlIssue = useCallback(
    (rowId: string, imageUrl: string) => {
      if (!matchedRows) {
        return;
      }
      const row = matchedRows.find((candidate) => candidate.id === rowId);
      if (row?.imageUrl !== imageUrl || row.imagePreviewAccepted) {
        return;
      }

      saveMatchedRows(
        matchedRows.map((candidate) =>
          candidate.id === rowId
            ? {
                ...candidate,
                imageUrl: "",
                imageUrlWarning: `${CATALOG_IMPORT_IMAGE_PREVIEW_WARNING_PREFIX}${imageUrl}`,
              }
            : candidate,
        ),
      );
      setLiveAnnouncement(
        `Image URL could not be loaded for source row ${row.sourceRow}.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const acknowledgeImagePreviewWarnings = useCallback(
    (rowIds: string[]) => {
      if (!matchedRows) {
        return;
      }

      const targetIds = new Set(rowIds);
      const resolvedCount = matchedRows.filter(
        (row) =>
          targetIds.has(row.id) &&
          isCatalogImportImagePreviewWarning(row.imageUrlWarning),
      ).length;
      if (resolvedCount === 0) {
        return;
      }

      const nextRows = matchedRows.map((row) =>
        targetIds.has(row.id) &&
        isCatalogImportImagePreviewWarning(row.imageUrlWarning)
          ? { ...row, imagePreviewAccepted: true, imageUrlWarning: null }
          : row,
      );
      saveMatchedRows(nextRows);
      captureIssueResolution({
        issueType: "image",
        resolvedCount,
        rows: nextRows,
      });
      setLastIssueAction({
        message: `${resolvedCount.toLocaleString()} seller image ${resolvedCount === 1 ? "warning was" : "warnings were"} reviewed.`,
        previousRows: matchedRows,
      });
      setLiveAnnouncement(
        `${resolvedCount.toLocaleString()} image preview ${resolvedCount === 1 ? "warning" : "warnings"} resolved.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const clearCultivarReferenceIdIssues = useCallback(
    async (rowIds: string[]) => {
      if (!matchedRows) {
        return;
      }
      const targetIds = new Set(rowIds);
      const targetRows = matchedRows.filter((row) => targetIds.has(row.id));
      if (targetRows.length === 0) {
        return;
      }

      const results = await requestCultivarMatches({
        includeCandidates: true,
        names: targetRows.map((row) => row.title),
      });
      const resultsByName = new Map(
        results.flatMap((result) =>
          result.normalizedInput
            ? [[result.normalizedInput, result] as const]
            : [],
        ),
      );
      let replacedCount = 0;
      const nextRows = assignCatalogImportDuplicateGroups(
        matchedRows.map((row) => {
          if (!targetIds.has(row.id)) {
            return row;
          }

          const result = resultsByName.get(
            normalizeCultivarName(row.title) ?? "",
          );
          const automaticMatch = result
            ? getAutomaticCultivarMatch(result)
            : null;
          if (automaticMatch) {
            replacedCount += 1;
          }

          return {
            ...row,
            cultivarReferenceIdWarning: null,
            duplicateAccepted: false,
            linkProvenance: automaticMatch
              ? automaticMatch.confidence === 100
                ? ("exact-name" as const)
                : ("automatic-name" as const)
              : null,
            linkState: automaticMatch
              ? ("linked" as const)
              : ("pending" as const),
            match: automaticMatch,
            sourceCultivarReferenceId: "",
            suggestedMatch: result?.candidates[0] ?? null,
          };
        }),
      );
      const nextReviewRow = getCatalogImportState(nextRows).reviewRows.find(
        (row) => targetIds.has(row.id),
      );
      if (nextReviewRow) {
        setActiveReviewRowId(nextReviewRow.id);
        setReviewQuery(nextReviewRow.sourceTitle);
        void loadCandidates(nextReviewRow);
      }
      saveMatchedRows(nextRows, nextReviewRow?.id);
      captureIssueResolution({
        issueType: "saved_id",
        resolvedCount: targetRows.length,
        rows: nextRows,
      });
      const reviewCount = targetRows.length - replacedCount;
      const replacementSummary =
        replacedCount > 0
          ? `${replacedCount.toLocaleString()} ${
              replacedCount === 1 ? "ID was" : "IDs were"
            } replaced by a confident name match.`
          : "";
      const reviewSummary =
        reviewCount > 0
          ? `${reviewCount.toLocaleString()} ${
              reviewCount === 1 ? "name needs" : "names need"
            } review.`
          : "";
      setLastIssueAction({
        message: [replacementSummary, reviewSummary].filter(Boolean).join(" "),
        previousRows: matchedRows,
      });
      setLiveAnnouncement(
        [replacementSummary, reviewSummary].filter(Boolean).join(" "),
      );
    },
    [loadCandidates, matchedRows, saveMatchedRows],
  );

  const undoLastIssueAction = useCallback(() => {
    if (!lastIssueAction) {
      return;
    }

    saveMatchedRows(lastIssueAction.previousRows);
    setLiveAnnouncement("Spreadsheet issue change undone.");
  }, [lastIssueAction, saveMatchedRows]);

  const downloadResults = useCallback(async () => {
    if (!parsedSpreadsheet || !matchedRows) {
      return;
    }

    setDownloadingResults(true);
    setDownloadError(null);
    try {
      const fileName = getDownloadFileName(parsedSpreadsheet.fileName);
      const spreadsheet = createCatalogEnrichedSpreadsheet({
        headerRowIndex,
        mapping,
        matchedRows,
        parsedSpreadsheet,
        selectedSheetIndex,
      });
      await downloadCatalogImportFile({ fileName, spreadsheet });
      const counts = getCatalogImportState(matchedRows).counts;
      capturePosthogEvent("catalog_import_downloaded", {
        download_state:
          counts.issueCount === 0 && counts.pendingCultivarDecisionCount === 0
            ? "prepared"
            : "current",
        file_type: getCatalogImportFileType(parsedSpreadsheet.fileName),
        sheet_count: parsedSpreadsheet.sheets.length,
        ...getCatalogImportTelemetryCounts(matchedRows),
      });
      setLiveAnnouncement(`${fileName} downloaded.`);
    } catch (error) {
      setDownloadError(getErrorMessage(error));
    } finally {
      setDownloadingResults(false);
    }
  }, [
    headerRowIndex,
    mapping,
    matchedRows,
    parsedSpreadsheet,
    selectedSheetIndex,
  ]);

  const downloadTemplate = useCallback(() => {
    downloadTextFile({
      contents: createCatalogImportTemplateCsv(),
      fileName: "daylily-clean-list-template.csv",
    });
  }, []);

  return {
    acknowledgeImagePreviewWarnings,
    activeReviewRow,
    activeReviewSourceCells,
    buildCatalogPreview,
    candidateResult,
    clearCultivarReferenceIdIssues,
    completedIssueCount,
    completedReviewCount,
    configureSheet,
    counts: importState.counts,
    downloadResults,
    downloadError,
    downloadSummary,
    downloadingResults,
    downloadTemplate,
    enrichment: importState.enrichment,
    excludeDuplicateRows,
    excludeReviewRow,
    fileError,
    flagImageUrlIssue,
    finishReviewRow,
    getSourceCellsForRow,
    handleHeaderChange,
    handleMappingChange,
    headerRowIndex,
    issueCount,
    issueProgressTotal,
    lastLinkAction,
    lastIssueAction,
    liveAnnouncement,
    loadFile,
    loadSampleCatalog,
    mapping,
    matchedCount,
    matchedRows,
    matchedRowsKey,
    matchError,
    matchingProgress,
    processingStage,
    moveReviewRow,
    openReviewRow,
    parsedSpreadsheet,
    readingFile,
    rejectFile,
    keepDuplicateRows,
    leaveRowUnmatched,
    removeDuplicateRow,
    remainingIssueCount,
    resetImporter,
    restoreUnmatchedRow,
    resolveImageUrlIssues,
    resolvePriceIssues,
    includedRows,
    reviewRows,
    reviewProgressTotal,
    activeReviewIndex,
    reviewQuery,
    resetCandidateSearch,
    searchCandidateResult,
    searchCandidates,
    selectRowMatch,
    selectedSheet,
    selectedSheetIndex,
    setReviewQuery,
    skipReviewRow,
    sourceColumns,
    sourcePreviewColumnIndexes,
    sourcePreviewRows,
    storageWarning,
    unmatchedCount,
    undoLastLinkAction,
    undoLastIssueAction,
  };
}

export type CatalogImporterWorkbenchController = ReturnType<
  typeof useCatalogImporterWorkbench
>;
