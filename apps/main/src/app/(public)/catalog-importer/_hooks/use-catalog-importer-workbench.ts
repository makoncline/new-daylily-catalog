"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  createCatalogImportRows,
  createCatalogImportSampleSpreadsheet,
  createCatalogImportTemplateCsv,
  detectHeaderRow,
  getAutomaticCultivarMatch,
  getCatalogImportDownloadSummary,
  getCatalogImportRowDisposition,
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
import type {
  CatalogImporterDraft,
  CatalogImporterSession,
} from "@/lib/catalog-importer-draft";
import { parseCatalogImportFile } from "@/lib/catalog-importer-file";
import {
  EMPTY_CATALOG_IMPORT_MAPPING,
  useCatalogImporterSession,
} from "@/hooks/use-catalog-importer-session";
import { useCatalogImporterDownloads } from "@/hooks/use-catalog-importer-downloads";
import { requestCultivarMatches } from "@/lib/catalog-importer-match-client";
import { logCatalogImporterSubmissionSample } from "@/lib/catalog-importer-submission-sample";
import { getCultivarMatchConfidence } from "@/lib/cultivar-match-score";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import { getErrorMessage } from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type {
  CatalogImporterCandidateResult,
  CatalogImporterMappingField,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";

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
    ready_count: rows.filter(
      (row) => getCatalogImportRowDisposition(row) === "ready",
    ).length,
    review_count: state.counts.pendingCultivarDecisionCount,
    row_count: state.counts.includedListingCount,
    warning_count: state.counts.warningCount,
  };
}

function mappingsAreEqual(
  left: CatalogColumnMapping,
  right: CatalogColumnMapping,
) {
  return Object.keys(left).every(
    (key) =>
      left[key as keyof CatalogColumnMapping] ===
      right[key as keyof CatalogColumnMapping],
  );
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

function useImporterRequest() {
  const active = useRef<AbortController | null>(null);
  return useMemo(() => {
    const cancel = () => {
      active.current?.abort();
      active.current = null;
    };
    return {
      cancel,
      start: () => {
        cancel();
        active.current = new AbortController();
        return active.current.signal;
      },
    };
  }, []);
}

export function useCatalogImporterWorkbench(
  initialDraft: CatalogImporterDraft | null = null,
) {
  const {
    session,
    sessionRef,
    commitSession,
    resetSession,
    flushDraft,
    storageWarning,
    selectedSheet,
    getSourceCellsForRow,
  } = useCatalogImporterSession(initialDraft);
  const initialReviewRows =
    initialDraft?.matchedRows?.filter(
      (row) =>
        row.rowKind === "listing" &&
        row.outputState === "included" &&
        row.cultivarReferenceIdWarning === null &&
        row.match === null &&
        row.linkState === "pending",
    ) ?? [];
  const initialReviewRow =
    initialReviewRows.find(
      (row) => row.id === initialDraft?.activeReviewRowId,
    ) ??
    initialReviewRows[0] ??
    null;
  const initialReviewedIssueActions = initialDraft?.reviewedIssueActions ?? [];
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
  const [preparation, setPreparation] = useState<
    | { stage: "detecting" | "building" }
    | { stage: "matching"; processed: number; total: number }
    | { stage: "failed"; error: string }
    | null
  >(null);
  const matchError = preparation?.stage === "failed" ? preparation.error : null;
  const processingStage =
    preparation?.stage === "failed" ? null : (preparation?.stage ?? null);
  const matchingProgress =
    preparation?.stage === "matching" ? preparation : null;
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
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const {
    downloadResults,
    downloadingResults,
    downloadError,
    setDownloadError,
  } = useCatalogImporterDownloads(session, setLiveAnnouncement);
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
  const createReviewedIssueActions = (
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
  };
  const fileRequest = useImporterRequest();
  const exactMatchRequest = useImporterRequest();
  const closeCandidateRequest = useImporterRequest();
  const searchCandidateRequest = useImporterRequest();
  const savedIdRematchRequest = useImporterRequest();
  const previewTracked = useRef(initialDraft?.matchedRows != null);

  const cancelMatchRequests = useCallback(() => {
    exactMatchRequest.cancel();
    closeCandidateRequest.cancel();
    searchCandidateRequest.cancel();
    savedIdRematchRequest.cancel();
  }, [
    exactMatchRequest,
    closeCandidateRequest,
    searchCandidateRequest,
    savedIdRematchRequest,
  ]);

  useEffect(
    () => () => {
      fileRequest.cancel();
      cancelMatchRequests();
    },
    [fileRequest, cancelMatchRequests],
  );

  const clearPreparedRows = (updates: Partial<CatalogImporterSession>) =>
    commitSession({
      activeReviewRowId: null,
      initialIssueCount: 0,
      initialReviewCount: 0,
      matchedRows: null,
      matchedRowsKey: null,
      reviewedIssueActions: [],
      ...updates,
    });

  const sourceColumns = useMemo(
    () =>
      selectedSheet ? getSourceColumns(selectedSheet.rows, headerRowIndex) : [],
    [headerRowIndex, selectedSheet],
  );
  const sourcePreviewRows =
    selectedSheet?.rows.slice(0, CATALOG_IMPORT_PREVIEW_ROW_COUNT) ?? [];
  const sourcePreviewColumnIndexes =
    getPopulatedColumnIndexes(sourcePreviewRows);
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

  const requestCandidates = useCallback(
    async (
      row: CatalogImportRow,
      query: string,
      request: ReturnType<typeof useImporterRequest>,
      setResult: (result: CatalogImporterCandidateResult) => void,
    ) => {
      const signal = request.start();
      const result: CatalogImporterCandidateResult = {
        candidates: [],
        error: null,
        loading: true,
        query,
        rowId: row.id,
      };
      setResult({ ...result });
      try {
        const [matches] = await requestCultivarMatches({
          includeCandidates: true,
          names: [query],
          signal,
        });
        result.candidates = matches?.candidates ?? [];
      } catch (error) {
        result.error = getErrorMessage(error);
      }
      if (!signal.aborted) setResult({ ...result, loading: false });
    },
    [],
  );

  const loadCandidates = useCallback(
    (row: CatalogImportRow) =>
      requestCandidates(
        row,
        row.title,
        closeCandidateRequest,
        setCandidateResult,
      ),
    [requestCandidates, closeCandidateRequest],
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

  const matchSpreadsheet = async ({
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
    const signal = exactMatchRequest.start();
    const source = {
      headerRowIndex: nextHeaderRowIndex,
      mapping: nextMapping,
      parsedSpreadsheet: spreadsheet,
      selectedSheetIndex: nextSheetIndex,
    };
    const sheet = spreadsheet.sheets[nextSheetIndex];
    if (!sheet || nextMapping.title === null) {
      setPreparation(null);
      await clearPreparedRows(source);
      return false;
    }

    setPreparation({ stage: "detecting" });
    const rows = createCatalogImportRows({
      headerRowIndex: nextHeaderRowIndex,
      mapping: nextMapping,
      rows: sheet.rows,
    });
    const rowsToMatch = rows.filter(
      (row) =>
        row.rowKind === "listing" &&
        row.outputState === "included" &&
        row.linkState !== "intentionally-unmatched",
    );
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
    if (rowsToMatch.length) {
      setReviewQuery("");
      closeCandidateRequest.cancel();
      searchCandidateRequest.cancel();
      setCandidateResult(null);
      setSearchCandidateResult(null);
      await clearPreparedRows(source);
    }
    if (signal.aborted) {
      return false;
    }

    setPreparation({
      stage: "matching",
      processed: 0,
      total: uniqueInputs.length,
    });
    const automaticMatches = new Map<string, CultivarMatchCandidate>();
    const cultivarReferenceMatches = new Map<string, CultivarMatchCandidate>();
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
          cultivarReferenceIds: batch.map((input) => input.cultivarReferenceId),
          includeCandidates: true,
          names: batch.map((input) => input.name),
          signal,
        });

        if (signal.aborted) {
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

        setPreparation({
          stage: "matching",
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

      if (signal.aborted) {
        return false;
      }

      const nextImportState = getCatalogImportState(nextRows);
      const nextReviewRow = nextImportState.reviewRows[0] ?? null;
      const nextIssueCount =
        nextImportState.counts.issueCount + nextImportState.counts.warningCount;
      setPreparation({ stage: "building" });
      await clearPreparedRows({
        ...source,
        activeReviewRowId: nextReviewRow?.id ?? null,
        initialIssueCount: nextIssueCount,
        initialReviewCount: nextImportState.counts.reviewQueueCount,
        matchedRows: nextRows,
        matchedRowsKey: rowsToMatch.length ? nextMatchKey : null,
      });
      if (signal.aborted) {
        return false;
      }

      setPreparation(null);
      if (rowsToMatch.length === 0) return true;
      setReviewQuery(nextReviewRow?.sourceTitle ?? "");
      globalThis.requestAnimationFrame?.(() => {
        globalThis.requestAnimationFrame?.(() => {
          document
            .getElementById("catalog-importer-summary")
            ?.scrollIntoView?.({ block: "start" });
        });
      });
      if (!previewTracked.current) {
        previewTracked.current = true;
        const telemetry = getCatalogImportTelemetryCounts(nextRows);
        const suggestedMapping = suggestColumnMapping(
          sheet.rows,
          nextHeaderRowIndex,
          getSourceColumns(sheet.rows, nextHeaderRowIndex),
        );
        logCatalogImporterSubmissionSample({
          headerRowIndex: nextHeaderRowIndex,
          importId: sessionRef.current.projectId,
          mapping: nextMapping,
          parsedSpreadsheet: spreadsheet,
          resultCounts: {
            issueCount: telemetry.issue_count,
            matchedCount: telemetry.matched_count,
            readyCount: telemetry.ready_count,
            reviewCount: telemetry.review_count,
            rowCount: telemetry.row_count,
            warningCount: telemetry.warning_count,
          },
          selectedSheetIndex: nextSheetIndex,
        });
        capturePosthogEvent("catalog_import_previewed", {
          file_type: getCatalogImportFileType(spreadsheet.fileName),
          import_id: sessionRef.current.projectId,
          mapped_field_count: Object.values(nextMapping).filter(
            (columnIndex) => columnIndex !== null,
          ).length,
          mapping_changed: !mappingsAreEqual(nextMapping, suggestedMapping),
          sheet_count: spreadsheet.sheets.length,
          source: spreadsheet.source ?? "upload",
          source_row_count: sheet.rows.length,
          ...telemetry,
        });
      }
      if (nextReviewRow) {
        void loadCandidates(nextReviewRow);
      }
      return true;
    } catch (error) {
      if (signal.aborted) {
        return false;
      }

      setPreparation({ stage: "failed", error: getErrorMessage(error) });
      capturePosthogEvent("catalog_import_failed", {
        error_code: "preview_generation_failed",
        file_type: getCatalogImportFileType(spreadsheet.fileName),
        import_id: sessionRef.current.projectId,
        stage: "preview",
      });
      return false;
    }
  };

  const buildCatalogPreview = async () => {
    if (!parsedSpreadsheet) {
      return false;
    }

    return matchSpreadsheet({
      headerRowIndex,
      mapping,
      selectedSheetIndex,
      spreadsheet: parsedSpreadsheet,
    });
  };

  const resetMatches = () => {
    cancelMatchRequests();
    setPreparation(null);
    setReviewQuery("");
    setCandidateResult(null);
    setSearchCandidateResult(null);
    setLastLinkAction(null);
  };

  const resetImporter = () => {
    fileRequest.cancel();
    resetSession();
    setFileError(null);
    setReadingFile(false);
    setDownloadError(null);
    resetMatches();
    setLiveAnnouncement("Local progress cleared.");
    previewTracked.current = false;
  };

  const setImportRowsIncluded = (rowIds: string[], included: boolean) => {
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
  };

  const setImportRowIncluded = (rowId: string, included: boolean) => {
    setImportRowsIncluded([rowId], included);
  };

  const updateImportRow = (
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
  };

  const getOriginalImportRow = (rowId: string) => {
    if (!selectedSheet) return null;

    return (
      createCatalogImportRows({
        headerRowIndex,
        mapping,
        rows: selectedSheet.rows,
      }).find((row) => row.id === rowId) ?? null
    );
  };

  const resetImportRow = (rowId: string) => {
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
  };

  const configureSheet = (
    spreadsheet: ParsedSpreadsheet,
    sheetIndex: number,
  ) => {
    const sheet = spreadsheet.sheets[sheetIndex];
    if (!sheet) {
      return;
    }

    fileRequest.cancel();
    setReadingFile(false);
    const nextHeaderRowIndex = detectHeaderRow(sheet.rows);
    const nextColumns = getSourceColumns(sheet.rows, nextHeaderRowIndex);
    const nextMapping = suggestColumnMapping(
      sheet.rows,
      nextHeaderRowIndex,
      nextColumns,
    );

    resetMatches();
    void clearPreparedRows({
      headerRowIndex: nextHeaderRowIndex,
      mapping: nextMapping,
      parsedSpreadsheet: spreadsheet,
      selectedSheetIndex: sheetIndex,
    });
  };

  const loadFile = async (file: File) => {
    let signal = fileRequest.start();
    setReadingFile(true);
    setFileError(null);

    try {
      const spreadsheet = await parseCatalogImportFile(file);
      if (signal.aborted) {
        return false;
      }
      previewTracked.current = false;
      if (spreadsheet.sheets.length === 1) {
        configureSheet(spreadsheet, 0);
        signal = fileRequest.start();
      } else {
        resetMatches();
        await clearPreparedRows({
          headerRowIndex: null,
          mapping: EMPTY_CATALOG_IMPORT_MAPPING,
          parsedSpreadsheet: spreadsheet,
          selectedSheetIndex: -1,
        });
      }
      if (signal.aborted) {
        return false;
      }
      setLiveAnnouncement(
        `${spreadsheet.fileName} loaded with ${spreadsheet.sheets.length.toLocaleString()} sheet${spreadsheet.sheets.length === 1 ? "" : "s"}.`,
      );
      return true;
    } catch (error) {
      if (signal.aborted) {
        return false;
      }
      setFileError(getErrorMessage(error));
      capturePosthogEvent("catalog_import_failed", {
        error_code: "file_parse_failed",
        file_type: getCatalogImportFileType(file.name),
        import_id: sessionRef.current.projectId,
        stage: "file",
      });
      return false;
    } finally {
      if (!signal.aborted) {
        setReadingFile(false);
      }
    }
  };

  const loadManualCatalog = () => {
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
    previewTracked.current = false;
    setFileError(null);
    configureSheet(spreadsheet, 0);
    setLiveAnnouncement("Manual catalog started.");
  };

  const replaceManualCatalogRows = (
    rows: ParsedSpreadsheet["sheets"][number]["rows"],
  ) => {
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
    void clearPreparedRows({
      parsedSpreadsheet: nextSpreadsheet,
      reviewedIssueActions: [],
    });
  };

  const addManualCatalogRow = ({
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
  };

  const removeManualCatalogRow = (rowIndex: number) => {
    const rows = (selectedSheet?.rows ?? []).filter(
      (_, index) => index !== rowIndex,
    );
    replaceManualCatalogRows(rows);
    setLiveAnnouncement("Listing removed from the spreadsheet.");
  };

  const loadSampleCatalog = () => {
    const spreadsheet = createCatalogImportSampleSpreadsheet();
    previewTracked.current = false;
    setFileError(null);
    configureSheet(spreadsheet, 0);
    setLiveAnnouncement("Sample daylily catalog loaded.");
  };

  const rejectFile = (message: string) => {
    setFileError(message);
    setLiveAnnouncement(message);
  };

  const handleHeaderChange = (value: string) => {
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
    void clearPreparedRows({
      headerRowIndex: nextHeaderRowIndex,
      mapping: nextMapping,
    });
  };

  const handleMappingChange = (
    field: CatalogImporterMappingField,
    value: number | null,
  ) => {
    if (!parsedSpreadsheet) {
      return;
    }

    const nextMapping = {
      ...mapping,
      [field]: value,
    };
    resetMatches();
    void clearPreparedRows({
      mapping: nextMapping,
    });
  };

  const searchCandidates = async (row: CatalogImportRow, query: string) => {
    if (query.trim())
      await requestCandidates(
        row,
        query.trim(),
        searchCandidateRequest,
        setSearchCandidateResult,
      );
  };

  const resetCandidateSearch = (row: CatalogImportRow) => {
    searchCandidateRequest.cancel();
    setReviewQuery(row.sourceTitle);
    setSearchCandidateResult(null);
  };

  const openReviewRow = (row: CatalogImportRow) => {
    searchCandidateRequest.cancel();
    setReviewQuery(row.sourceTitle);
    void loadCandidates(row);
    setSearchCandidateResult(null);
    setLiveAnnouncement(`Reviewing source row ${row.sourceRow}: ${row.title}.`);
    void commitSession({ activeReviewRowId: row.id });
  };

  const moveReviewRow = (direction: -1 | 1) => {
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
  };

  const finishReviewRow = (
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
    searchCandidateRequest.cancel();
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
      closeCandidateRequest.cancel();
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
  };

  const skipReviewRow = () => {
    if (!activeReviewRow) {
      return;
    }

    finishReviewRow(activeReviewRow.id, {
      linkProvenance: null,
      linkState: "intentionally-unmatched",
      match: null,
    });
  };

  const excludeAllReviewRows = () => {
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

    closeCandidateRequest.cancel();
    searchCandidateRequest.cancel();
    setCandidateResult(null);
    setSearchCandidateResult(null);
    setReviewQuery("");
    setLiveAnnouncement(
      `${reviewRows.length.toLocaleString()} listings excluded. Manual review is complete.`,
    );
    saveMatchedRows(nextRows, null);
  };

  const excludeReviewRow = () => {
    if (!activeReviewRow) {
      return;
    }

    finishReviewRow(activeReviewRow.id, {
      linkProvenance: null,
      linkState: "pending",
      match: null,
      outputState: "removed",
    });
  };

  const leaveRowUnmatched = (rowId: string) => {
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
  };

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

      searchCandidateRequest.cancel();
      setSearchCandidateResult(null);
      setReviewQuery(restoredRow.sourceTitle);
      void loadCandidates(restoredRow);
      setLiveAnnouncement(`${restoredRow.sourceTitle} returned to review.`);
      saveMatchedRows(nextRows, rowId);
    },
    [loadCandidates, matchedRows, saveMatchedRows, searchCandidateRequest],
  );

  const selectRowMatch = (rowId: string, match: CultivarMatchCandidate) => {
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
  };

  const undoLastLinkAction = () => {
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
      searchCandidateRequest.cancel();
      setSearchCandidateResult(null);
      setReviewQuery(restoredReviewRow.sourceTitle);
      void loadCandidates(restoredReviewRow);
    }
    saveMatchedRows(nextRows, restoredReviewRow?.id);
    setLiveAnnouncement(
      `${lastLinkAction.displayName} identity decision undone.`,
    );
  };

  const removeDuplicateRow = (rowId: string) => {
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
    setLiveAnnouncement(`Source row ${removedRow.sourceRow} removed.`);
  };

  const keepDuplicateRows = (rowIds: string[]) => {
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
    setLiveAnnouncement(
      `${retainedIds.size.toLocaleString()} duplicate listings kept.`,
    );
  };

  const excludeIssueRows = (rowIds: string[], kind = "") => {
    const excludedIds = new Set(rowIds);
    if (excludedIds.size === 0 || !matchedRows) return;
    saveMatchedRows(
      assignCatalogImportDuplicateGroups(
        matchedRows.map((row) =>
          excludedIds.has(row.id)
            ? { ...row, duplicateOfSourceRow: null, outputState: "removed" }
            : row,
        ),
      ),
      undefined,
      {
        reviewedIssueActions: createReviewedIssueActions(
          `${excludedIds.size.toLocaleString()} listings were excluded.`,
          matchedRows,
          excludedIds,
        ),
      },
    );
    setLiveAnnouncement(
      `${excludedIds.size.toLocaleString()} ${kind}listings excluded.`,
    );
  };
  const excludeDuplicateRows = (rowIds: string[]) =>
    excludeIssueRows(rowIds, "duplicate ");

  const resolvePriceIssues = (
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
    setLiveAnnouncement(
      `${prices.size.toLocaleString()} price ${prices.size === 1 ? "issue" : "issues"} resolved.`,
    );
  };

  const clearCultivarReferenceIdIssues = async (rowIds: string[]) => {
    const rowsBeforeRequest = sessionRef.current.matchedRows;
    if (!rowsBeforeRequest) {
      return;
    }
    const targetIds = new Set(rowIds);
    const targetRows = rowsBeforeRequest.filter((row) => targetIds.has(row.id));
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
    const signal = savedIdRematchRequest.start();

    let results: Awaited<ReturnType<typeof requestCultivarMatches>>;
    try {
      results = await requestCultivarMatches({
        includeCandidates: true,
        names: targetRows.map((row) => row.title),
        signal,
      });
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      throw error;
    }
    if (signal.aborted) {
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
    setLiveAnnouncement(actionSummary);
  };

  const undoReviewedIssueAction = (actionId: number, rowId?: string) => {
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

    const previousRowsById = new Map(rowsToRestore.map((row) => [row.id, row]));
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
  };

  const downloadTemplate = () => {
    downloadTextFile({
      contents: createCatalogImportTemplateCsv(),
      fileName: "daylily-clean-list-template.csv",
    });
  };

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
