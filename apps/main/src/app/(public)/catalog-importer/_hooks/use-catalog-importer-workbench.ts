"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CATALOG_IMPORT_PRO_MATCH_BATCH_SIZE,
  CATALOG_IMPORT_PUBLIC_MATCH_BATCH_SIZE,
  CATALOG_IMPORT_PUBLIC_SAMPLE_ROW_LIMIT,
} from "@/config/catalog-importer";
import {
  applyAutomaticCultivarMatches,
  cellToText,
  columnIndexToLabel,
  createCatalogImportCsv,
  createCatalogImportRows,
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
  readCatalogImporterDraft,
  writeCatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import type { CatalogImporterMode } from "@/lib/catalog-importer-draft";
import { parseCatalogImportFile } from "@/lib/catalog-importer-file";
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
  description: null,
  imageUrl: null,
  price: null,
  privateNote: null,
  title: null,
};

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

function removeRowFromDuplicateGroup(rows: CatalogImportRow[], rowId: string) {
  const removedRow = rows.find((row) => row.id === rowId);
  const normalizedTitle = removedRow
    ? normalizeCultivarName(removedRow.title)
    : null;
  if (!removedRow || !normalizedTitle) {
    return rows;
  }

  let firstRetainedSourceRow: number | null = null;
  return rows.map((row) => {
    if (row.id === rowId) {
      return { ...row, duplicateOfSourceRow: null, skipped: true };
    }
    if (row.skipped || normalizeCultivarName(row.title) !== normalizedTitle) {
      return row;
    }

    const duplicateOfSourceRow = firstRetainedSourceRow;
    firstRetainedSourceRow ??= row.sourceRow;
    return row.duplicateOfSourceRow === duplicateOfSourceRow
      ? row
      : { ...row, duplicateOfSourceRow };
  });
}

export function useCatalogImporterWorkbench() {
  const [mode, setMode] = useState<CatalogImporterMode>("public");
  const [parsedSpreadsheet, setParsedSpreadsheet] =
    useState<ParsedSpreadsheet | null>(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [mapping, setMapping] = useState<CatalogColumnMapping>(EMPTY_MAPPING);
  const [fileError, setFileError] = useState<string | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [matchedRows, setMatchedRows] = useState<CatalogImportRow[] | null>(
    null,
  );
  const [matchedRowsKey, setMatchedRowsKey] = useState<string | null>(null);
  const [matchingProgress, setMatchingProgress] = useState<{
    processed: number;
    total: number;
  } | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [activeReviewRowId, setActiveReviewRowId] = useState<string | null>(
    null,
  );
  const [reviewQuery, setReviewQuery] = useState("");
  const [candidateResult, setCandidateResult] =
    useState<CatalogImporterCandidateResult | null>(null);
  const [searchCandidateResult, setSearchCandidateResult] =
    useState<CatalogImporterCandidateResult | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const candidateRequestId = useRef(0);
  const exactMatchRequestId = useRef(0);
  const searchCandidateRequestId = useRef(0);

  const selectedSheet = parsedSpreadsheet?.sheets[selectedSheetIndex] ?? null;
  const sourceColumns = useMemo(
    () =>
      selectedSheet ? getSourceColumns(selectedSheet.rows, headerRowIndex) : [],
    [headerRowIndex, selectedSheet],
  );
  const draftRows = useMemo(
    () =>
      selectedSheet
        ? createCatalogImportRows({
            headerRowIndex,
            mapping,
            rows: selectedSheet.rows,
          })
        : [],
    [headerRowIndex, mapping, selectedSheet],
  );
  const currentMatchKey = useMemo(
    () =>
      JSON.stringify({
        fileName: parsedSpreadsheet?.fileName ?? null,
        headerRowIndex,
        mapping,
        mode,
        rowCount: selectedSheet?.rows.length ?? 0,
        sheetName: selectedSheet?.name ?? null,
      }),
    [
      headerRowIndex,
      mapping,
      mode,
      parsedSpreadsheet?.fileName,
      selectedSheet?.name,
      selectedSheet?.rows.length,
    ],
  );
  const sourcePreviewRows = selectedSheet?.rows.slice(0, 10) ?? [];
  const sourcePreviewColumnCount = sourcePreviewRows.reduce(
    (largest, row) => Math.max(largest, row.length),
    0,
  );
  const activeReviewRow =
    matchedRows?.find((row) => row.id === activeReviewRowId) ?? null;
  const sourceColumnCount = useMemo(
    () =>
      selectedSheet?.rows.reduce(
        (largest, row) => Math.max(largest, row.length),
        0,
      ) ?? 0,
    [selectedSheet],
  );
  const getSourceCellsForRow = useCallback(
    (row: CatalogImportRow) => {
      if (!selectedSheet) {
        return [];
      }

      const sourceRow = selectedSheet.rows[row.sourceRow - 1] ?? [];
      const headerRow =
        headerRowIndex === null ? null : selectedSheet.rows[headerRowIndex];

      return Array.from({ length: sourceColumnCount }, (_, columnIndex) => ({
        column: columnIndexToLabel(columnIndex),
        label:
          (headerRow ? cellToText(headerRow[columnIndex]) : "") ||
          `Column ${columnIndexToLabel(columnIndex)}`,
        value: cellToText(sourceRow[columnIndex]),
      }));
    },
    [headerRowIndex, selectedSheet, sourceColumnCount],
  );
  const activeReviewSourceCells = useMemo(() => {
    if (!activeReviewRow) {
      return [];
    }

    return getSourceCellsForRow(activeReviewRow);
  }, [activeReviewRow, getSourceCellsForRow]);
  const skippedCount = draftRows.filter((row) => row.skipped).length;
  const duplicateCount = draftRows.filter(
    (row) => row.duplicateOfSourceRow !== null && !row.skipped,
  ).length;
  const warningCount = draftRows.filter(
    (row) =>
      !row.skipped &&
      (row.priceWarning !== null || row.imageUrlWarning !== null),
  ).length;
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
  const activeReviewIndex = activeReviewRow
    ? reviewRows.findIndex((row) => row.id === activeReviewRow.id)
    : -1;
  const currentStep: "upload" | "map" | "review" = !parsedSpreadsheet
    ? "upload"
    : matchedRows === null
      ? "map"
      : "review";

  useEffect(() => {
    const draft = readCatalogImporterDraft();
    if (draft) {
      setMode(draft.mode);
      setParsedSpreadsheet(draft.parsedSpreadsheet);
      setSelectedSheetIndex(draft.selectedSheetIndex);
      setHeaderRowIndex(draft.headerRowIndex);
      setMapping(draft.mapping);
      setMatchedRows(draft.matchedRows);
      setMatchedRowsKey(draft.matchedRowsKey);
      setActiveReviewRowId(draft.activeReviewRowId);
      setReviewQuery(draft.reviewQuery);
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }
    if (!parsedSpreadsheet) {
      clearCatalogImporterDraft();
      setStorageWarning(null);
      return;
    }

    const result = writeCatalogImporterDraft({
      activeReviewRowId,
      headerRowIndex,
      mapping,
      matchedRows,
      matchedRowsKey,
      mode,
      parsedSpreadsheet,
      reviewQuery,
      selectedSheetIndex,
      version: 1,
    });

    setStorageWarning(
      result === "too-large"
        ? "This workbook is too large to restore after a refresh. It will remain available while this page stays open."
        : result === "unavailable"
          ? "Browser progress could not be saved on this device."
          : null,
    );
  }, [
    activeReviewRowId,
    headerRowIndex,
    mapping,
    matchedRows,
    matchedRowsKey,
    mode,
    parsedSpreadsheet,
    reviewQuery,
    selectedSheetIndex,
    storageReady,
  ]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    const rowsToMatch = draftRows.filter((row) => !row.skipped);
    if (mapping.title === null || rowsToMatch.length === 0) {
      setMatchedRows(null);
      setMatchedRowsKey(null);
      setMatchingProgress(null);
      return;
    }
    if (matchedRows !== null && matchedRowsKey === currentMatchKey) {
      return;
    }

    const uniqueNames = [
      ...new Map(
        rowsToMatch.map((row) => [
          normalizeCultivarName(row.title) ?? row.title,
          row.title,
        ]),
      ).values(),
    ];
    const requestId = exactMatchRequestId.current + 1;
    const controller = new AbortController();
    exactMatchRequestId.current = requestId;
    setMatchedRows(null);
    setMatchedRowsKey(null);
    setMatchError(null);
    setMatchingProgress({ processed: 0, total: uniqueNames.length });
    setActiveReviewRowId(null);
    setReviewQuery("");
    setCandidateResult(null);
    setSearchCandidateResult(null);

    const timeout = window.setTimeout(() => {
      void (async () => {
        const automaticMatches = new Map<string, CultivarMatchCandidate>();
        const suggestedMatches = new Map<string, CultivarMatchCandidate>();
        const batchSize =
          mode === "public"
            ? CATALOG_IMPORT_PUBLIC_MATCH_BATCH_SIZE
            : CATALOG_IMPORT_PRO_MATCH_BATCH_SIZE;

        try {
          for (let start = 0; start < uniqueNames.length; start += batchSize) {
            const batch = uniqueNames.slice(start, start + batchSize);
            const results = await requestCultivarMatches({
              includeCandidates: true,
              names: batch,
              signal: controller.signal,
            });

            if (exactMatchRequestId.current !== requestId) {
              return;
            }

            for (const result of results) {
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
              processed: Math.min(start + batch.length, uniqueNames.length),
              total: uniqueNames.length,
            });

            if (
              mode === "public" &&
              applyAutomaticCultivarMatches({
                automaticMatches,
                limit: CATALOG_IMPORT_PUBLIC_SAMPLE_ROW_LIMIT,
                matchedOnly: true,
                rows: draftRows,
                suggestedMatches,
              }).length >= CATALOG_IMPORT_PUBLIC_SAMPLE_ROW_LIMIT
            ) {
              break;
            }
          }

          const nextRows = applyAutomaticCultivarMatches({
            automaticMatches,
            limit:
              mode === "public"
                ? CATALOG_IMPORT_PUBLIC_SAMPLE_ROW_LIMIT
                : undefined,
            matchedOnly: mode === "public",
            rows: draftRows,
            suggestedMatches,
          });

          if (exactMatchRequestId.current !== requestId) {
            return;
          }

          setMatchedRows(nextRows);
          setMatchedRowsKey(currentMatchKey);
          setMatchingProgress(null);
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
      })();
    }, 150);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    currentMatchKey,
    draftRows,
    mapping.title,
    matchedRows,
    matchedRowsKey,
    mode,
    storageReady,
  ]);

  const resetMatches = useCallback(() => {
    exactMatchRequestId.current += 1;
    candidateRequestId.current += 1;
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
    clearCatalogImporterDraft();
    setMode("public");
    setParsedSpreadsheet(null);
    setSelectedSheetIndex(0);
    setHeaderRowIndex(null);
    setMapping(EMPTY_MAPPING);
    setFileError(null);
    setReadingFile(false);
    resetMatches();
    setStorageWarning(null);
    setLiveAnnouncement("Importer reset.");
  }, [resetMatches]);

  const handleModeChange = useCallback(
    (nextMode: string) => {
      if (nextMode !== "public" && nextMode !== "pro") {
        return;
      }
      setMode(nextMode);
      resetMatches();
    },
    [resetMatches],
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

      setSelectedSheetIndex(sheetIndex);
      setHeaderRowIndex(nextHeaderRowIndex);
      setMapping(nextMapping);
      resetMatches();
    },
    [resetMatches],
  );

  const loadFile = useCallback(
    async (file: File) => {
      setReadingFile(true);
      setFileError(null);

      try {
        const spreadsheet = await parseCatalogImportFile(file);
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
    },
    [resetMatches, selectedSheet],
  );

  const handleMappingChange = useCallback(
    (field: CatalogImporterMappingField, value: number | null) => {
      setMapping((currentMapping) => ({
        ...currentMapping,
        [field]: value,
      }));
      resetMatches();
    },
    [resetMatches],
  );

  const loadCandidates = useCallback(
    async (row: CatalogImportRow, query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return;
      }

      const requestId = candidateRequestId.current + 1;
      candidateRequestId.current = requestId;
      setCandidateResult({
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
        if (candidateRequestId.current !== requestId) {
          return;
        }

        setCandidateResult({
          candidates: result?.candidates ?? [],
          error: null,
          loading: false,
          query: trimmedQuery,
          rowId: row.id,
        });
      } catch (error) {
        if (candidateRequestId.current !== requestId) {
          return;
        }

        setCandidateResult({
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
      setSearchCandidateResult(null);
      setLiveAnnouncement(
        `Reviewing source row ${row.sourceRow}: ${row.title}.`,
      );
      void loadCandidates(row, row.title);
    },
    [loadCandidates],
  );

  useEffect(() => {
    if (reviewRows.length === 0) {
      if (activeReviewRowId !== null) {
        setActiveReviewRowId(null);
        setReviewQuery("");
        setCandidateResult(null);
        setSearchCandidateResult(null);
      }
      return;
    }

    const activeRow =
      reviewRows.find((row) => row.id === activeReviewRowId) ?? reviewRows[0]!;

    if (activeRow.id !== activeReviewRowId) {
      openReviewRow(activeRow);
      return;
    }

    if (candidateResult?.rowId !== activeRow.id) {
      setReviewQuery(activeRow.sourceTitle);
      void loadCandidates(activeRow, activeRow.title);
    }
  }, [
    activeReviewRowId,
    candidateResult?.rowId,
    loadCandidates,
    openReviewRow,
    reviewRows,
  ]);

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
      const nextRows = matchedRows.map((row) =>
        row.id === rowId ? { ...row, ...normalizedUpdate } : row,
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

      setMatchedRows(nextRows);
      setCandidateResult(null);
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
        void loadCandidates(nextReviewRow, nextReviewRow.title);
      } else {
        setActiveReviewRowId(null);
        setReviewQuery("");
        setLiveAnnouncement(
          `${reviewedRow?.title ?? "Row"} ${action}. Manual review is complete.`,
        );
      }
    },
    [loadCandidates, matchedRows],
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
      setMatchedRows(
        (currentRows) =>
          currentRows?.map((row) =>
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
                  matchStatus: "selected",
                  skipped: false,
                }
              : row,
          ) ?? null,
      );
      setLiveAnnouncement(`Match changed to ${match.displayName}.`);
    },
    [],
  );

  const removeDuplicateRow = useCallback(
    (rowId: string) => {
      const removedRow = matchedRows?.find((row) => row.id === rowId);
      if (!removedRow) {
        return;
      }

      setMatchedRows((currentRows) =>
        currentRows ? removeRowFromDuplicateGroup(currentRows, rowId) : null,
      );
      setLiveAnnouncement(`Source row ${removedRow.sourceRow} removed.`);
    },
    [matchedRows],
  );

  const keepDuplicateRows = useCallback((rowIds: string[]) => {
    const retainedIds = new Set(rowIds);
    if (retainedIds.size === 0) {
      return;
    }

    setMatchedRows(
      (currentRows) =>
        currentRows?.map((row) =>
          retainedIds.has(row.id) && row.duplicateOfSourceRow !== null
            ? { ...row, duplicateOfSourceRow: null }
            : row,
        ) ?? null,
    );
    setLiveAnnouncement(
      `${retainedIds.size.toLocaleString()} duplicate listings kept.`,
    );
  }, []);

  const resolvePriceIssue = useCallback(
    (rowId: string, price: number | null) => {
      const resolvedRow = matchedRows?.find((row) => row.id === rowId);
      if (!resolvedRow) {
        return;
      }

      setMatchedRows(
        (currentRows) =>
          currentRows?.map((row) =>
            row.id === rowId ? { ...row, price, priceWarning: null } : row,
          ) ?? null,
      );
      setLiveAnnouncement(
        `Price issue resolved for source row ${resolvedRow.sourceRow}.`,
      );
    },
    [matchedRows],
  );

  const resolveImageUrlIssue = useCallback(
    (rowId: string, imageUrl: string) => {
      const resolvedRow = matchedRows?.find((row) => row.id === rowId);
      if (!resolvedRow) {
        return;
      }

      setMatchedRows(
        (currentRows) =>
          currentRows?.map((row) =>
            row.id === rowId
              ? { ...row, imageUrl, imageUrlWarning: null }
              : row,
          ) ?? null,
      );
      setLiveAnnouncement(
        `Image URL issue resolved for source row ${resolvedRow.sourceRow}.`,
      );
    },
    [matchedRows],
  );

  const downloadResults = useCallback(() => {
    if (!parsedSpreadsheet || !matchedRows) {
      return;
    }

    downloadTextFile({
      contents: createCatalogImportCsv(matchedRows),
      fileName: getDownloadFileName(parsedSpreadsheet.fileName),
    });
  }, [matchedRows, parsedSpreadsheet]);

  const downloadTemplate = useCallback(() => {
    downloadTextFile({
      contents: createCatalogImportTemplateCsv(),
      fileName: "daylily-catalog-import-template.csv",
    });
  }, []);

  return {
    activeReviewRow,
    activeReviewSourceCells,
    candidateResult,
    configureSheet,
    currentStep,
    downloadResults,
    downloadTemplate,
    draftRows,
    duplicateCount,
    fileError,
    finishReviewRow,
    getSourceCellsForRow,
    handleHeaderChange,
    handleMappingChange,
    handleModeChange,
    headerRowIndex,
    liveAnnouncement,
    loadCandidates,
    loadFile,
    mapping,
    matchedRows,
    matchError,
    matchingProgress,
    mode,
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
    skippedCount,
    sourceColumns,
    sourcePreviewColumnCount,
    sourcePreviewRows,
    storageWarning,
    warningCount,
  };
}

export type CatalogImporterWorkbenchController = ReturnType<
  typeof useCatalogImporterWorkbench
>;
