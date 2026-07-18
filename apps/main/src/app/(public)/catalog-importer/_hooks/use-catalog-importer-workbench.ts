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
  cellToText,
  columnIndexToLabel,
  createCatalogEnrichedSpreadsheet,
  createCatalogImportRows,
  createCatalogImportSampleSpreadsheet,
  createCatalogImportTemplateCsv,
  detectHeaderRow,
  getAutomaticCultivarMatch,
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
  const activeRows = rows.filter((row) => !row.skipped);
  const duplicateIssueCount = new Set(
    activeRows
      .filter((row) => row.duplicateOfSourceRow !== null)
      .map((row) => row.duplicateOfSourceRow),
  ).size;

  return {
    issue_count:
      duplicateIssueCount +
      activeRows.filter((row) => row.priceWarning !== null).length +
      activeRows.filter((row) => row.imageUrlWarning !== null).length +
      activeRows.filter((row) => row.cultivarReferenceIdWarning !== null)
        .length,
    matched_count: activeRows.filter((row) => row.match !== null).length,
    review_count: activeRows.filter(
      (row) => row.match === null && row.matchStatus === "pending",
    ).length,
    row_count: activeRows.length,
  };
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
            removed: true,
            skipped: true,
          }
        : row,
    ),
  );
}

export function useCatalogImporterWorkbench(
  initialDraft: CatalogImporterDraft | null = null,
) {
  const initialReviewRow =
    initialDraft?.matchedRows?.find(
      (row) =>
        row.id === initialDraft.activeReviewRowId &&
        !row.skipped &&
        row.match === null &&
        row.matchStatus === "pending",
    ) ??
    initialDraft?.matchedRows?.find(
      (row) =>
        !row.skipped && row.match === null && row.matchStatus === "pending",
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
  const [matchingProgress, setMatchingProgress] = useState<{
    processed: number;
    total: number;
  } | null>(null);
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
  const exactMatchRequestId = useRef(0);
  const exactMatchAbortController = useRef<AbortController | null>(null);
  const closeCandidateRequestId = useRef(0);
  const searchCandidateRequestId = useRef(0);
  const draftWriteChain = useRef(Promise.resolve());
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
  const resultRows = useMemo(
    () => matchedRows?.filter((row) => !row.skipped) ?? [],
    [matchedRows],
  );
  const reviewRows = useMemo(
    () =>
      matchedRows?.filter(
        (row) =>
          !row.skipped && row.match === null && row.matchStatus === "pending",
      ) ?? [],
    [matchedRows],
  );
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
  const matchedCount = resultRows.filter((row) => row.match !== null).length;
  const unmatchedCount = resultRows.filter(
    (row) => row.match === null && row.matchStatus === "unmatched",
  ).length;
  const duplicateIssueCount = new Set(
    resultRows
      .filter((row) => row.duplicateOfSourceRow !== null)
      .map((row) => row.duplicateOfSourceRow),
  ).size;
  const issueCount =
    duplicateIssueCount +
    resultRows.filter((row) => row.priceWarning !== null).length +
    resultRows.filter((row) => row.imageUrlWarning !== null).length +
    resultRows.filter((row) => row.cultivarReferenceIdWarning !== null).length;
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
        mapping,
        matchedRows,
        matchedRowsKey,
        parsedSpreadsheet,
        selectedSheetIndex,
        ...overrides,
        version: 2,
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
      setMatchedRows(nextRows);
      void persistDraft({
        activeReviewRowId: nextActiveReviewRowId,
        matchedRows: nextRows,
      });
    },
    [activeReviewRowId, persistDraft],
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
        setMatchingProgress(null);
        await persistDraft({
          activeReviewRowId: null,
          headerRowIndex: nextHeaderRowIndex,
          mapping: nextMapping,
          matchedRows: null,
          matchedRowsKey: null,
          parsedSpreadsheet: spreadsheet,
          selectedSheetIndex: nextSheetIndex,
        });
        return;
      }

      const rows = createCatalogImportRows({
        headerRowIndex: nextHeaderRowIndex,
        mapping: nextMapping,
        rows: sheet.rows,
      });
      const rowsToMatch = rows.filter((row) => !row.skipped);
      if (rowsToMatch.length === 0) {
        setMatchedRows(rows);
        setMatchedRowsKey(null);
        setMatchingProgress(null);
        await persistDraft({
          activeReviewRowId: null,
          headerRowIndex: nextHeaderRowIndex,
          mapping: nextMapping,
          matchedRows: rows,
          matchedRowsKey: null,
          parsedSpreadsheet: spreadsheet,
          selectedSheetIndex: nextSheetIndex,
        });
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
      setMatchError(null);
      setMatchingProgress({ processed: 0, total: uniqueInputs.length });
      setActiveReviewRowId(null);
      setReviewQuery("");
      closeCandidateRequestId.current += 1;
      setCandidateResult(null);
      setSearchCandidateResult(null);

      await persistDraft({
        activeReviewRowId: null,
        headerRowIndex: nextHeaderRowIndex,
        mapping: nextMapping,
        matchedRows: null,
        matchedRowsKey: null,
        parsedSpreadsheet: spreadsheet,
        selectedSheetIndex: nextSheetIndex,
      });
      if (exactMatchRequestId.current !== requestId) {
        return;
      }

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

        const nextReviewRow =
          nextRows.find(
            (row) =>
              !row.skipped &&
              row.match === null &&
              row.matchStatus === "pending",
          ) ?? null;
        setMatchedRows(nextRows);
        setMatchedRowsKey(nextMatchKey);
        setActiveReviewRowId(nextReviewRow?.id ?? null);
        setReviewQuery(nextReviewRow?.sourceTitle ?? "");
        setMatchingProgress(null);
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
        await persistDraft({
          activeReviewRowId: nextReviewRow?.id ?? null,
          headerRowIndex: nextHeaderRowIndex,
          mapping: nextMapping,
          matchedRows: nextRows,
          matchedRowsKey: nextMatchKey,
          parsedSpreadsheet: spreadsheet,
          selectedSheetIndex: nextSheetIndex,
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          exactMatchRequestId.current !== requestId
        ) {
          return;
        }

        setMatchError(getErrorMessage(error));
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
    setMatchingProgress(null);
    setMatchError(null);
    setActiveReviewRowId(null);
    setReviewQuery("");
    setCandidateResult(null);
    setSearchCandidateResult(null);
  }, []);

  const resetImporter = useCallback(() => {
    void persistDraft({
      activeReviewRowId: null,
      headerRowIndex: null,
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
    setLiveAnnouncement("Cleaner reset.");
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

      try {
        const spreadsheet = await parseCatalogImportFile(file);
        previewTracked.current = false;
        capturePosthogEvent("catalog_import_started", {
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
    previewTracked.current = false;
    capturePosthogEvent("catalog_import_started", {
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
      update: Pick<CatalogImportRow, "match" | "matchStatus" | "skipped">,
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
      const previousReviewRows = matchedRows.filter(
        (row) =>
          !row.skipped && row.match === null && row.matchStatus === "pending",
      );
      const reviewedIndex = Math.max(
        0,
        previousReviewRows.findIndex((row) => row.id === rowId),
      );
      const nextReviewRows = nextRows.filter(
        (row) =>
          !row.skipped && row.match === null && row.matchStatus === "pending",
      );
      const nextReviewRow =
        nextReviewRows[reviewedIndex % Math.max(nextReviewRows.length, 1)] ??
        null;

      searchCandidateRequestId.current += 1;
      setSearchCandidateResult(null);

      const action = update.skipped
        ? "skipped"
        : update.match
          ? `matched to ${update.match.displayName}`
          : "skipped";

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
    },
    [loadCandidates, matchedRows, saveMatchedRows],
  );

  const skipReviewRow = useCallback(() => {
    if (!activeReviewRow) {
      return;
    }

    finishReviewRow(activeReviewRow.id, {
      match: null,
      matchStatus: "unmatched",
      skipped: false,
    });
  }, [activeReviewRow, finishReviewRow]);

  const selectRowMatch = useCallback(
    (rowId: string, match: CultivarMatchCandidate) => {
      if (!matchedRows) {
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
                matchStatus: "selected",
                skipped: false,
              }
            : row,
        ),
      );
      saveMatchedRows(nextRows);
      setLiveAnnouncement(`Match changed to ${match.displayName}.`);
    },
    [matchedRows, saveMatchedRows],
  );

  const removeDuplicateRow = useCallback(
    (rowId: string) => {
      if (!matchedRows) {
        return;
      }
      const removedRow = matchedRows.find((row) => row.id === rowId);
      if (!removedRow) {
        return;
      }

      saveMatchedRows(removeRowFromDuplicateGroup(matchedRows, rowId));
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
      setLiveAnnouncement(
        `${retainedIds.size.toLocaleString()} duplicate listings kept.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const resolvePriceIssue = useCallback(
    (rowId: string, price: number | null) => {
      if (!matchedRows) {
        return;
      }
      const resolvedRow = matchedRows.find((row) => row.id === rowId);
      if (!resolvedRow) {
        return;
      }

      saveMatchedRows(
        matchedRows.map((row) =>
          row.id === rowId ? { ...row, price, priceWarning: null } : row,
        ),
      );
      setLiveAnnouncement(
        `Price issue resolved for source row ${resolvedRow.sourceRow}.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const resolveImageUrlIssue = useCallback(
    (rowId: string, imageUrl: string) => {
      if (!matchedRows) {
        return;
      }
      const resolvedRow = matchedRows.find((row) => row.id === rowId);
      if (!resolvedRow) {
        return;
      }

      saveMatchedRows(
        matchedRows.map((row) =>
          row.id === rowId ? { ...row, imageUrl, imageUrlWarning: null } : row,
        ),
      );
      setLiveAnnouncement(
        `Image URL issue resolved for source row ${resolvedRow.sourceRow}.`,
      );
    },
    [matchedRows, saveMatchedRows],
  );

  const clearCultivarReferenceIdIssue = useCallback(
    (rowId: string) => {
      if (!matchedRows) {
        return;
      }
      const resolvedRow = matchedRows.find((row) => row.id === rowId);
      if (!resolvedRow) {
        return;
      }

      const nextRows = assignCatalogImportDuplicateGroups(
        matchedRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                cultivarReferenceIdWarning: null,
                duplicateAccepted: false,
                match: null,
                matchStatus: "pending",
                sourceCultivarReferenceId: "",
              }
            : row,
        ),
      );
      const nextReviewRow = nextRows.find((row) => row.id === rowId);
      setActiveReviewRowId(rowId);
      setReviewQuery(resolvedRow.sourceTitle);
      if (nextReviewRow) {
        void loadCandidates(nextReviewRow);
      }
      saveMatchedRows(nextRows, rowId);
      setLiveAnnouncement(
        `Saved cultivar ID cleared for source row ${resolvedRow.sourceRow}. Match it by name.`,
      );
    },
    [loadCandidates, matchedRows, saveMatchedRows],
  );

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
      capturePosthogEvent("catalog_import_downloaded", {
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
    activeReviewRow,
    activeReviewSourceCells,
    buildCatalogPreview,
    candidateResult,
    clearCultivarReferenceIdIssue,
    configureSheet,
    downloadResults,
    downloadError,
    downloadingResults,
    downloadTemplate,
    fileError,
    finishReviewRow,
    getSourceCellsForRow,
    handleHeaderChange,
    handleMappingChange,
    headerRowIndex,
    issueCount,
    liveAnnouncement,
    loadFile,
    loadSampleCatalog,
    mapping,
    matchedCount,
    matchedRows,
    matchedRowsKey,
    matchError,
    matchingProgress,
    moveReviewRow,
    openReviewRow,
    parsedSpreadsheet,
    readingFile,
    rejectFile,
    keepDuplicateRows,
    removeDuplicateRow,
    resetImporter,
    resolveImageUrlIssue,
    resolvePriceIssue,
    resultRows,
    reviewRows,
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
  };
}

export type CatalogImporterWorkbenchController = ReturnType<
  typeof useCatalogImporterWorkbench
>;
