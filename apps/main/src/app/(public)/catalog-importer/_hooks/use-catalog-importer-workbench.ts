"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import {
  CATALOG_IMPORT_MATCH_BATCH_SIZE,
  CATALOG_IMPORT_PREVIEW_ROW_COUNT,
} from "@/config/catalog-importer";
import {
  applyAutomaticCultivarMatches,
  appendCatalogImportOriginalPriceNote,
  assignCatalogImportDuplicateGroups,
  cellToText,
  columnIndexToLabel,
  createCatalogCleanSpreadsheet,
  createCatalogEnrichedSpreadsheet,
  createCatalogImportRows,
  createCatalogImportSampleSpreadsheet,
  createCatalogImportTemplateCsv,
  detectHeaderRow,
  getAutomaticCultivarMatch,
  getCatalogImportDownloadSummary,
  getCatalogImportMappedColumnLabel,
  getCatalogImportOrderedColumnIndexes,
  getCatalogImportState,
  getSourceColumns,
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
  createCatalogImporterProjectId,
  serializeCatalogImporterSession,
  writeCatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import type {
  CatalogImporterDraft,
  CatalogImporterSession,
} from "@/lib/catalog-importer-draft";
import {
  downloadCatalogImportFile,
  parseCatalogImportFile,
} from "@/lib/catalog-importer-file";
import { requestCultivarMatches } from "@/lib/catalog-importer-match-client";
import { logCatalogImporterSubmissionSample } from "@/lib/catalog-importer-submission-sample";
import { getCultivarMatchConfidence } from "@/lib/cultivar-match-score";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import {
  getCatalogImporterDownloadFileName,
  getErrorMessage,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type {
  CatalogImporterCandidateResult,
  CatalogImporterMappingField,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

const EMPTY_MAPPING: CatalogColumnMapping = {
  cultivarReferenceId: null,
  description: null,
  price: null,
  privateNote: null,
  title: null,
};

const MANUAL_CATALOG_HEADERS = [
  "Name",
  "Price",
  "Description",
  "Private Note",
  "Daylily Catalog ID",
];

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
  issueType: "duplicate" | "excluded" | "price" | "saved_id";
  resolvedCount: number;
  rows: CatalogImportRow[];
}) {
  capturePosthogEvent("catalog_import_issue_resolved", {
    issue_type: issueType,
    resolved_count: resolvedCount,
    ...getCatalogImportTelemetryCounts(rows),
  });
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

function getNextReviewedIssueActions({
  actionId,
  affectedRowIds,
  message,
  previousRows,
  reviewedIssueActions,
}: {
  actionId: number;
  affectedRowIds: Iterable<string>;
  message: string;
  previousRows: CatalogImportRow[];
  reviewedIssueActions: CatalogImporterSession["reviewedIssueActions"];
}) {
  const affectedIds = new Set(affectedRowIds);
  const affectedRows = previousRows.filter((row) => affectedIds.has(row.id));
  if (affectedRows.length === 0) {
    return reviewedIssueActions;
  }

  return [
    ...reviewedIssueActions.filter((action) =>
      action.previousRows.every((row) => !affectedIds.has(row.id)),
    ),
    {
      id: actionId,
      message,
      previousRows: affectedRows,
    },
  ];
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
    mapping: initialDraft?.mapping ?? EMPTY_MAPPING,
    matchedRows: initialDraft?.matchedRows ?? null,
    matchedRowsKey: initialDraft?.matchedRowsKey ?? null,
    parsedSpreadsheet: initialDraft?.parsedSpreadsheet ?? null,
    projectId: initialDraft?.projectId ?? createCatalogImporterProjectId(),
    reviewedIssueActions: initialReviewedIssueActions,
    selectedSheetIndex: initialDraft?.selectedSheetIndex ?? 0,
  }));
  const sessionRef = useRef(session);
  const {
    activeReviewRowId,
    headerRowIndex,
    initialIssueCount,
    initialReviewCount,
    mapping,
    matchedRows,
    matchedRowsKey,
    parsedSpreadsheet,
    projectId,
    reviewedIssueActions,
    selectedSheetIndex,
  } = session;
  const [fileError, setFileError] = useState<string | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [downloadingResults, setDownloadingResults] = useState<
    "clean" | "enriched" | null
  >(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [matchingProgress, setMatchingProgress] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const [processingStage, setProcessingStage] = useState<
    "building" | "detecting" | "matching" | null
  >(null);
  const [matchError, setMatchError] = useState<string | null>(null);
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
  const issueActionSequence = useRef(
    initialReviewedIssueActions.reduce(
      (highestId, action) => Math.max(highestId, action.id),
      0,
    ),
  );
  const createReviewedIssueActions = useCallback(
    (
      message: string,
      previousRows: CatalogImportRow[],
      affectedRowIds: Iterable<string>,
    ) => {
      const actionId = issueActionSequence.current + 1;
      const nextActions = getNextReviewedIssueActions({
        actionId,
        affectedRowIds,
        message,
        previousRows,
        reviewedIssueActions: sessionRef.current.reviewedIssueActions,
      });
      if (nextActions !== sessionRef.current.reviewedIssueActions) {
        issueActionSequence.current = actionId;
      }
      return nextActions;
    },
    [],
  );
  const exactMatchRequestId = useRef(0);
  const exactMatchAbortController = useRef<AbortController | null>(null);
  const closeCandidateRequestId = useRef(0);
  const searchCandidateRequestId = useRef(0);
  const savedIdRematchRequestId = useRef(0);
  const savedIdRematchAbortController = useRef<AbortController | null>(null);
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

  const saveMatchedRows = useCallback(
    (
      nextRows: CatalogImportRow[],
      nextActiveReviewRowId = activeReviewRowId,
      sessionUpdates: Pick<
        Partial<CatalogImporterSession>,
        "reviewedIssueActions"
      > = {},
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
      void commitSession({
        ...sessionUpdates,
        activeReviewRowId: nextActiveReviewRowId,
        initialIssueCount: nextInitialIssueCount,
        initialReviewCount: nextInitialReviewCount,
        matchedRows: nextRows,
      });
    },
    [activeReviewRowId, initialIssueCount, initialReviewCount, commitSession],
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
        setMatchingProgress(null);
        setProcessingStage(null);
        await commitSession({
          activeReviewRowId: null,
          headerRowIndex: nextHeaderRowIndex,
          initialIssueCount: 0,
          initialReviewCount: 0,
          mapping: nextMapping,
          matchedRows: null,
          matchedRowsKey: null,
          parsedSpreadsheet: spreadsheet,
          reviewedIssueActions: [],
          selectedSheetIndex: nextSheetIndex,
        });
        return false;
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
        setMatchingProgress(null);
        await commitSession({
          activeReviewRowId: null,
          headerRowIndex: nextHeaderRowIndex,
          initialIssueCount: nextIssueCount,
          initialReviewCount: nextReviewCount,
          mapping: nextMapping,
          matchedRows: rows,
          matchedRowsKey: null,
          parsedSpreadsheet: spreadsheet,
          reviewedIssueActions: [],
          selectedSheetIndex: nextSheetIndex,
        });
        setProcessingStage(null);
        return true;
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
      setMatchError(null);
      setMatchingProgress(null);
      setReviewQuery("");
      closeCandidateRequestId.current += 1;
      setCandidateResult(null);
      setSearchCandidateResult(null);

      await commitSession({
        activeReviewRowId: null,
        headerRowIndex: nextHeaderRowIndex,
        initialIssueCount: 0,
        initialReviewCount: 0,
        mapping: nextMapping,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet: spreadsheet,
        reviewedIssueActions: [],
        selectedSheetIndex: nextSheetIndex,
      });
      if (exactMatchRequestId.current !== requestId) {
        return false;
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
            return false;
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
          return false;
        }

        const nextImportState = getCatalogImportState(nextRows);
        const nextReviewRow = nextImportState.reviewRows[0] ?? null;
        const nextIssueCount =
          nextImportState.counts.issueCount +
          nextImportState.counts.warningCount;
        const nextReviewCount = nextImportState.counts.reviewQueueCount;
        setProcessingStage("building");
        setMatchingProgress(null);
        await commitSession({
          activeReviewRowId: nextReviewRow?.id ?? null,
          headerRowIndex: nextHeaderRowIndex,
          initialIssueCount: nextIssueCount,
          initialReviewCount: nextReviewCount,
          mapping: nextMapping,
          matchedRows: nextRows,
          matchedRowsKey: nextMatchKey,
          parsedSpreadsheet: spreadsheet,
          reviewedIssueActions: [],
          selectedSheetIndex: nextSheetIndex,
        });
        if (exactMatchRequestId.current !== requestId) {
          return false;
        }

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
        return true;
      } catch (error) {
        if (
          controller.signal.aborted ||
          exactMatchRequestId.current !== requestId
        ) {
          return false;
        }

        setMatchError(getErrorMessage(error));
        setProcessingStage(null);
        setMatchingProgress(null);
        return false;
      }
    },
    [loadCandidates, commitSession],
  );

  const buildCatalogPreview = useCallback(async () => {
    if (!parsedSpreadsheet) {
      return false;
    }

    logCatalogImporterSubmissionSample({
      headerRowIndex,
      mapping,
      parsedSpreadsheet,
      selectedSheetIndex,
    });
    return matchSpreadsheet({
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
    savedIdRematchRequestId.current += 1;
    savedIdRematchAbortController.current?.abort();
    savedIdRematchAbortController.current = null;
    setMatchingProgress(null);
    setProcessingStage(null);
    setMatchError(null);
    setReviewQuery("");
    setCandidateResult(null);
    setSearchCandidateResult(null);
    setLastLinkAction(null);
  }, []);

  const resetImporter = useCallback(() => {
    const nextProjectId = createCatalogImporterProjectId();
    void commitSession({
      activeReviewRowId: null,
      headerRowIndex: null,
      initialIssueCount: 0,
      initialReviewCount: 0,
      mapping: EMPTY_MAPPING,
      matchedRows: null,
      matchedRowsKey: null,
      parsedSpreadsheet: null,
      projectId: nextProjectId,
      reviewedIssueActions: [],
      selectedSheetIndex: 0,
    });
    setFileError(null);
    setReadingFile(false);
    setDownloadError(null);
    resetMatches();
    setStorageWarning(null);
    setLiveAnnouncement("Local progress cleared.");
    previewTracked.current = false;
  }, [commitSession, resetMatches]);

  const setImportRowsIncluded = useCallback(
    (rowIds: string[], included: boolean) => {
      if (!matchedRows || rowIds.length === 0) return;

      const targetIds = new Set(rowIds);

      saveMatchedRows(
        assignCatalogImportDuplicateGroups(
          matchedRows.map((row) =>
            targetIds.has(row.id)
              ? {
                  ...row,
                  outputState: included ? "included" : "removed",
                }
              : row,
          ),
        ),
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const setImportRowIncluded = useCallback(
    (rowId: string, included: boolean) => {
      setImportRowsIncluded([rowId], included);
    },
    [setImportRowsIncluded],
  );

  const updateImportRow = useCallback(
    (
      rowId: string,
      updates: {
        description: string;
        price: number | null;
        privateNote: string;
      },
    ) => {
      if (!matchedRows) return;

      saveMatchedRows(
        matchedRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                description: updates.description,
                price: updates.price,
                priceWarning: null,
                privateNote: updates.privateNote,
              }
            : row,
        ),
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const getOriginalImportRow = useCallback(
    (rowId: string) => {
      if (!selectedSheet) return null;

      return (
        createCatalogImportRows({
          headerRowIndex,
          mapping,
          rows: selectedSheet.rows,
        }).find((row) => row.id === rowId) ?? null
      );
    },
    [headerRowIndex, mapping, selectedSheet],
  );

  const resetImportRow = useCallback(
    (rowId: string) => {
      if (!matchedRows) return;

      const originalRow = getOriginalImportRow(rowId);
      if (!originalRow) return;

      saveMatchedRows(
        matchedRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                description: originalRow.description,
                price: originalRow.price,
                priceWarning: originalRow.priceWarning,
                privateNote: originalRow.privateNote,
              }
            : row,
        ),
      );
    },
    [getOriginalImportRow, matchedRows, saveMatchedRows],
  );

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

      resetMatches();
      void commitSession({
        activeReviewRowId: null,
        headerRowIndex: nextHeaderRowIndex,
        initialIssueCount: 0,
        initialReviewCount: 0,
        mapping: nextMapping,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet: spreadsheet,
        reviewedIssueActions: [],
        selectedSheetIndex: sheetIndex,
      });
    },
    [commitSession, resetMatches],
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
        if (spreadsheet.sheets.length === 1) {
          configureSheet(spreadsheet, 0);
        } else {
          resetMatches();
          await commitSession({
            activeReviewRowId: null,
            headerRowIndex: null,
            initialIssueCount: 0,
            initialReviewCount: 0,
            mapping: EMPTY_MAPPING,
            matchedRows: null,
            matchedRowsKey: null,
            parsedSpreadsheet: spreadsheet,
            reviewedIssueActions: [],
            selectedSheetIndex: -1,
          });
        }
        setLiveAnnouncement(
          `${spreadsheet.fileName} loaded with ${spreadsheet.sheets.length.toLocaleString()} sheet${spreadsheet.sheets.length === 1 ? "" : "s"}.`,
        );
        return true;
      } catch (error) {
        setFileError(getErrorMessage(error));
        return false;
      } finally {
        setReadingFile(false);
      }
    },
    [configureSheet, commitSession, resetMatches],
  );

  const loadManualCatalog = useCallback(() => {
    const spreadsheet: ParsedSpreadsheet = {
      fileName: "My daylily catalog.csv",
      source: "manual",
      sheets: [
        {
          name: "Listings",
          rows: [[...MANUAL_CATALOG_HEADERS]],
        },
      ],
    };
    identityDecisionTracked.current = false;
    previewTracked.current = false;
    capturePosthogEvent("catalog_import_started", {
      file_type: "csv",
      source: "manual",
    });
    setFileError(null);
    configureSheet(spreadsheet, 0);
    setLiveAnnouncement("Manual catalog started.");
  }, [configureSheet]);

  const replaceManualCatalogRows = useCallback(
    (rows: ParsedSpreadsheet["sheets"][number]["rows"]) => {
      if (parsedSpreadsheet?.source !== "manual") {
        return;
      }
      const nextSpreadsheet: ParsedSpreadsheet = {
        ...parsedSpreadsheet,
        sheets: parsedSpreadsheet.sheets.map((sheet, index) =>
          index === selectedSheetIndex ? { ...sheet, rows } : sheet,
        ),
      };
      resetMatches();
      void commitSession({
        activeReviewRowId: null,
        initialIssueCount: 0,
        initialReviewCount: 0,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet: nextSpreadsheet,
        reviewedIssueActions: [],
      });
    },
    [parsedSpreadsheet, commitSession, resetMatches, selectedSheetIndex],
  );

  const addManualCatalogRow = useCallback(
    ({
      cultivarReferenceId = "",
      name,
    }: {
      cultivarReferenceId?: string;
      name: string;
    }) => {
      const rows = selectedSheet?.rows ?? [];
      if (!name.trim() || rows.length - 1 >= 10) return;
      replaceManualCatalogRows([
        ...rows,
        [name.trim(), "", "", "", cultivarReferenceId],
      ]);
      setLiveAnnouncement(`${name.trim()} added to the spreadsheet.`);
    },
    [replaceManualCatalogRows, selectedSheet?.rows],
  );

  const removeManualCatalogRow = useCallback(
    (rowIndex: number) => {
      const rows = (selectedSheet?.rows ?? []).filter(
        (_, index) => index !== rowIndex,
      );
      replaceManualCatalogRows(rows);
      setLiveAnnouncement("Listing removed from the spreadsheet.");
    },
    [replaceManualCatalogRows, selectedSheet?.rows],
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

      resetMatches();
      void commitSession({
        activeReviewRowId: null,
        headerRowIndex: nextHeaderRowIndex,
        initialIssueCount: 0,
        initialReviewCount: 0,
        mapping: nextMapping,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet,
        reviewedIssueActions: [],
        selectedSheetIndex,
      });
    },
    [
      parsedSpreadsheet,
      commitSession,
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
      resetMatches();
      void commitSession({
        activeReviewRowId: null,
        headerRowIndex,
        initialIssueCount: 0,
        initialReviewCount: 0,
        mapping: nextMapping,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet,
        reviewedIssueActions: [],
        selectedSheetIndex,
      });
    },
    [
      headerRowIndex,
      mapping,
      parsedSpreadsheet,
      commitSession,
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
      setReviewQuery(row.sourceTitle);
      void loadCandidates(row);
      setSearchCandidateResult(null);
      setLiveAnnouncement(
        `Reviewing source row ${row.sourceRow}: ${row.title}.`,
      );
      void commitSession({ activeReviewRowId: row.id });
    },
    [loadCandidates, commitSession],
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
                identityReviewed: true,
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
        setReviewQuery(nextReviewRow.sourceTitle);
        void loadCandidates(nextReviewRow);
      } else {
        closeCandidateRequestId.current += 1;
        setCandidateResult(null);
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

  const excludeAllReviewRows = useCallback(() => {
    if (!matchedRows || reviewRows.length === 0) {
      return;
    }

    const reviewRowIds = new Set(reviewRows.map((row) => row.id));
    const nextRows = assignCatalogImportDuplicateGroups(
      matchedRows.map((row) =>
        reviewRowIds.has(row.id)
          ? {
              ...row,
              duplicateOfSourceRow: null,
              identityReviewed: true,
              outputState: "removed" as const,
            }
          : row,
      ),
    );

    closeCandidateRequestId.current += 1;
    searchCandidateRequestId.current += 1;
    setCandidateResult(null);
    setSearchCandidateResult(null);
    setReviewQuery("");
    setLiveAnnouncement(
      `${reviewRows.length.toLocaleString()} listings excluded. Manual review is complete.`,
    );
    saveMatchedRows(nextRows, null);
  }, [matchedRows, reviewRows, saveMatchedRows]);

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
                identityReviewed: true,
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

  const resetReviewedRow = useCallback(
    (rowId: string) => {
      if (!matchedRows) {
        return;
      }

      const previousRow = matchedRows.find((row) => row.id === rowId);
      if (!previousRow?.identityReviewed) {
        return;
      }

      const restoredRow: CatalogImportRow = {
        ...previousRow,
        duplicateAccepted: false,
        identityReviewed: false,
        linkProvenance: null,
        linkState: "pending",
        match: null,
        outputState: "included",
      };
      const nextRows = assignCatalogImportDuplicateGroups(
        matchedRows.map((row) => (row.id === rowId ? restoredRow : row)),
      );

      searchCandidateRequestId.current += 1;
      setSearchCandidateResult(null);
      setReviewQuery(restoredRow.sourceTitle);
      void loadCandidates(restoredRow);
      setLiveAnnouncement(`${restoredRow.sourceTitle} returned to review.`);
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
                identityReviewed: true,
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
      const nextReviewedIssueActions = createReviewedIssueActions(
        `Source row ${removedRow.sourceRow} was excluded.`,
        matchedRows,
        [rowId],
      );
      saveMatchedRows(nextRows, undefined, {
        reviewedIssueActions: nextReviewedIssueActions,
      });
      captureIssueResolution({
        issueType: "duplicate",
        resolvedCount: 1,
        rows: nextRows,
      });
      setLiveAnnouncement(`Source row ${removedRow.sourceRow} removed.`);
    },
    [createReviewedIssueActions, matchedRows, saveMatchedRows],
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
      const nextReviewedIssueActions = createReviewedIssueActions(
        `Kept ${retainedIds.size.toLocaleString()} listings.`,
        matchedRows,
        retainedIds,
      );
      saveMatchedRows(nextRows, undefined, {
        reviewedIssueActions: nextReviewedIssueActions,
      });
      captureIssueResolution({
        issueType: "duplicate",
        resolvedCount: retainedIds.size,
        rows: nextRows,
      });
      setLiveAnnouncement(
        `${retainedIds.size.toLocaleString()} duplicate listings kept.`,
      );
    },
    [createReviewedIssueActions, matchedRows, saveMatchedRows],
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
      const nextReviewedIssueActions = createReviewedIssueActions(
        `${excludedIds.size.toLocaleString()} listings were excluded.`,
        matchedRows,
        excludedIds,
      );
      saveMatchedRows(nextRows, undefined, {
        reviewedIssueActions: nextReviewedIssueActions,
      });
      captureIssueResolution({
        issueType: "duplicate",
        resolvedCount: excludedIds.size,
        rows: nextRows,
      });
      setLiveAnnouncement(
        `${excludedIds.size.toLocaleString()} duplicate listings excluded.`,
      );
    },
    [createReviewedIssueActions, matchedRows, saveMatchedRows],
  );

  const excludeIssueRows = useCallback(
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
      const nextReviewedIssueActions = createReviewedIssueActions(
        `${excludedIds.size.toLocaleString()} listings were excluded.`,
        matchedRows,
        excludedIds,
      );
      saveMatchedRows(nextRows, undefined, {
        reviewedIssueActions: nextReviewedIssueActions,
      });
      captureIssueResolution({
        issueType: "excluded",
        resolvedCount: excludedIds.size,
        rows: nextRows,
      });
      setLiveAnnouncement(
        `${excludedIds.size.toLocaleString()} listings excluded.`,
      );
    },
    [createReviewedIssueActions, matchedRows, saveMatchedRows],
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
                ? appendCatalogImportOriginalPriceNote(
                    row.privateNote,
                    row.sourcePrice,
                  )
                : row.privateNote,
            }
          : row,
      );
      const nextReviewedIssueActions = createReviewedIssueActions(
        `${prices.size.toLocaleString()} price ${prices.size === 1 ? "value was" : "values were"} updated.`,
        matchedRows,
        prices.keys(),
      );
      saveMatchedRows(nextRows, undefined, {
        reviewedIssueActions: nextReviewedIssueActions,
      });
      captureIssueResolution({
        issueType: "price",
        resolvedCount: prices.size,
        rows: nextRows,
      });
      setLiveAnnouncement(
        `${prices.size.toLocaleString()} price ${prices.size === 1 ? "issue" : "issues"} resolved.`,
      );
    },
    [createReviewedIssueActions, matchedRows, saveMatchedRows],
  );

  const clearCultivarReferenceIdIssues = useCallback(
    async (rowIds: string[]) => {
      const rowsBeforeRequest = sessionRef.current.matchedRows;
      if (!rowsBeforeRequest) {
        return;
      }
      const targetIds = new Set(rowIds);
      const targetRows = rowsBeforeRequest.filter((row) =>
        targetIds.has(row.id),
      );
      if (targetRows.length === 0) {
        return;
      }

      const invalidIdStateByRowId = new Map(
        targetRows.map((row) => [
          row.id,
          {
            sourceCultivarReferenceId: row.sourceCultivarReferenceId,
            warning: row.cultivarReferenceIdWarning,
          },
        ]),
      );
      const requestId = savedIdRematchRequestId.current + 1;
      savedIdRematchRequestId.current = requestId;
      savedIdRematchAbortController.current?.abort();
      const controller = new AbortController();
      savedIdRematchAbortController.current = controller;

      let results: Awaited<ReturnType<typeof requestCultivarMatches>>;
      try {
        results = await requestCultivarMatches({
          includeCandidates: true,
          names: targetRows.map((row) => row.title),
          signal: controller.signal,
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          savedIdRematchRequestId.current !== requestId
        ) {
          return;
        }
        throw error;
      } finally {
        if (savedIdRematchAbortController.current === controller) {
          savedIdRematchAbortController.current = null;
        }
      }
      if (
        controller.signal.aborted ||
        savedIdRematchRequestId.current !== requestId
      ) {
        return;
      }

      const currentRows = sessionRef.current.matchedRows;
      if (!currentRows) {
        return;
      }
      const currentTargetIds = new Set(
        currentRows.flatMap((row) => {
          const initialState = invalidIdStateByRowId.get(row.id);
          return initialState &&
            row.outputState === "included" &&
            row.cultivarReferenceIdWarning === initialState.warning &&
            row.sourceCultivarReferenceId ===
              initialState.sourceCultivarReferenceId
            ? [row.id]
            : [];
        }),
      );
      if (currentTargetIds.size === 0) {
        return;
      }

      const resultsByName = new Map(
        results.flatMap((result) =>
          result.normalizedInput
            ? [[result.normalizedInput, result] as const]
            : [],
        ),
      );
      let replacedCount = 0;
      const nextRows = assignCatalogImportDuplicateGroups(
        currentRows.map((row) => {
          if (!currentTargetIds.has(row.id)) {
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
        (row) => currentTargetIds.has(row.id),
      );
      if (nextReviewRow) {
        setReviewQuery(nextReviewRow.sourceTitle);
        void loadCandidates(nextReviewRow);
      }
      const reviewCount = currentTargetIds.size - replacedCount;
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
      const actionSummary = [replacementSummary, reviewSummary]
        .filter(Boolean)
        .join(" ");
      const nextReviewedIssueActions = createReviewedIssueActions(
        actionSummary,
        currentRows,
        currentTargetIds,
      );
      saveMatchedRows(nextRows, nextReviewRow?.id, {
        reviewedIssueActions: nextReviewedIssueActions,
      });
      captureIssueResolution({
        issueType: "saved_id",
        resolvedCount: currentTargetIds.size,
        rows: nextRows,
      });
      setLiveAnnouncement(actionSummary);
    },
    [createReviewedIssueActions, loadCandidates, saveMatchedRows],
  );

  const undoReviewedIssueAction = useCallback(
    (actionId: number, rowId?: string) => {
      if (!matchedRows) {
        return;
      }
      const action = reviewedIssueActions.find(
        (candidate) => candidate.id === actionId,
      );
      if (!action) {
        return;
      }

      const rowsToRestore = rowId
        ? action.previousRows.filter((row) => row.id === rowId)
        : action.previousRows;
      if (rowsToRestore.length === 0) {
        return;
      }

      const previousRowsById = new Map(
        rowsToRestore.map((row) => [row.id, row]),
      );
      const nextRows = assignCatalogImportDuplicateGroups(
        matchedRows.map((row) => previousRowsById.get(row.id) ?? row),
      );
      const remainingPreviousRows = rowId
        ? action.previousRows.filter((row) => row.id !== rowId)
        : [];
      const nextActions = sessionRef.current.reviewedIssueActions.flatMap(
        (candidate) => {
          if (candidate.id !== actionId) {
            return [candidate];
          }

          return remainingPreviousRows.length > 0
            ? [{ ...candidate, previousRows: remainingPreviousRows }]
            : [];
        },
      );
      saveMatchedRows(nextRows, undefined, {
        reviewedIssueActions: nextActions,
      });
      setLiveAnnouncement("Spreadsheet issue change undone.");
    },
    [matchedRows, reviewedIssueActions, saveMatchedRows],
  );

  const downloadResults = useCallback(
    async (kind: "clean" | "enriched" = "enriched") => {
      if (!parsedSpreadsheet || !matchedRows) {
        return;
      }

      setDownloadingResults(kind);
      setDownloadError(null);
      try {
        const fileName = getCatalogImporterDownloadFileName(
          parsedSpreadsheet.fileName,
          kind,
        );
        const spreadsheet =
          kind === "clean"
            ? createCatalogCleanSpreadsheet({ matchedRows, parsedSpreadsheet })
            : createCatalogEnrichedSpreadsheet({
                headerRowIndex,
                mapping,
                matchedRows,
                parsedSpreadsheet,
                retainExcludedRows: true,
                selectedSheetIndex,
              });
        await downloadCatalogImportFile({ fileName, spreadsheet });
        const counts = getCatalogImportState(matchedRows).counts;
        capturePosthogEvent("catalog_import_downloaded", {
          download_state:
            counts.issueCount === 0 &&
            counts.warningCount === 0 &&
            counts.pendingCultivarDecisionCount === 0
              ? "prepared"
              : "current",
          download_type: kind,
          file_type: getCatalogImportFileType(parsedSpreadsheet.fileName),
          sheet_count: parsedSpreadsheet.sheets.length,
          ...getCatalogImportTelemetryCounts(matchedRows),
        });
        setLiveAnnouncement(`${fileName} downloaded.`);
      } catch (error) {
        setDownloadError(getErrorMessage(error));
      } finally {
        setDownloadingResults(null);
      }
    },
    [
      headerRowIndex,
      mapping,
      matchedRows,
      parsedSpreadsheet,
      selectedSheetIndex,
    ],
  );

  const downloadTemplate = useCallback(() => {
    downloadTextFile({
      contents: createCatalogImportTemplateCsv(),
      fileName: "daylily-clean-list-template.csv",
    });
  }, []);

  const flushDraft = useCallback(() => draftWriteChain.current, []);

  return {
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
    excludeAllReviewRows,
    excludeDuplicateRows,
    excludeIssueRows,
    excludeReviewRow,
    fileError,
    finishReviewRow,
    flushDraft,
    getSourceCellsForRow,
    getOriginalImportRow,
    handleHeaderChange,
    handleMappingChange,
    headerRowIndex,
    issueCount,
    issueProgressTotal,
    lastLinkAction,
    liveAnnouncement,
    loadFile,
    loadManualCatalog,
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
    projectId,
    readingFile,
    reviewedIssueActions,
    rejectFile,
    keepDuplicateRows,
    leaveRowUnmatched,
    removeDuplicateRow,
    removeManualCatalogRow,
    remainingIssueCount,
    resetImporter,
    resetReviewedRow,
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
    setImportRowIncluded,
    setImportRowsIncluded,
    skipReviewRow,
    sourceColumns,
    sourcePreviewColumnIndexes,
    sourcePreviewRows,
    storageWarning,
    updateImportRow,
    unmatchedCount,
    undoLastLinkAction,
    undoReviewedIssueAction,
    resetImportRow,
    addManualCatalogRow,
  };
}

export type CatalogImporterWorkbenchController = ReturnType<
  typeof useCatalogImporterWorkbench
>;
