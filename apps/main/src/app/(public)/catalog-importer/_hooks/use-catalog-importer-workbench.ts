"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CATALOG_IMPORT_PRO_MATCH_BATCH_SIZE,
  CATALOG_IMPORT_PUBLIC_MATCH_BATCH_SIZE,
  CATALOG_IMPORT_PUBLIC_SAMPLE_ROW_LIMIT,
} from "@/config/catalog-importer";
import {
  applyAutomaticCultivarMatches,
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
  CultivarNameMatchResult,
  ParsedSpreadsheet,
} from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
  writeCatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import type { CatalogImporterMode } from "@/lib/catalog-importer-draft";
import { parseCatalogImportFile } from "@/lib/catalog-importer-file";
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

async function requestCultivarMatches({
  includeCandidates,
  names,
  signal,
}: {
  includeCandidates: boolean;
  names: string[];
  signal?: AbortSignal;
}) {
  const response = await fetch("/api/v1/cultivars/match", {
    body: JSON.stringify({ includeCandidates, names }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    signal,
  });
  const payload = (await response.json()) as {
    error?: string;
    message?: string;
    results?: CultivarNameMatchResult[];
  };

  if (!response.ok || !payload.results) {
    throw new Error(
      payload.message ?? payload.error ?? "Cultivar matching failed.",
    );
  }

  return payload.results;
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
  const [storageReady, setStorageReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const candidateRequestId = useRef(0);
  const exactMatchRequestId = useRef(0);

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

    const timeout = window.setTimeout(() => {
      void (async () => {
        const automaticMatches = new Map<string, CultivarMatchCandidate>();
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
    setMatchedRows(null);
    setMatchedRowsKey(null);
    setMatchingProgress(null);
    setMatchError(null);
    setActiveReviewRowId(null);
    setReviewQuery("");
    setCandidateResult(null);
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

  const openReviewRow = useCallback(
    (row: CatalogImportRow) => {
      setActiveReviewRowId(row.id);
      setReviewQuery(row.title);
      setLiveAnnouncement(
        `Reviewing source row ${row.sourceRow}: ${row.title}.`,
      );
      void loadCandidates(row, row.title);
    },
    [loadCandidates],
  );

  const closeReview = useCallback(() => {
    candidateRequestId.current += 1;
    setActiveReviewRowId(null);
    setCandidateResult(null);
    setReviewQuery("");
    setLiveAnnouncement("Match review closed.");
  }, []);

  const finishReviewRow = useCallback(
    (
      rowId: string,
      update: Pick<CatalogImportRow, "match" | "matchStatus" | "skipped">,
    ) => {
      if (!matchedRows) {
        return;
      }

      const reviewedRow = matchedRows.find((row) => row.id === rowId);
      const nextRows = matchedRows.map((row) =>
        row.id === rowId ? { ...row, ...update } : row,
      );
      const nextPending = nextRows.find(
        (row) => !row.skipped && row.matchStatus === "pending",
      );

      setMatchedRows(nextRows);
      setCandidateResult(null);

      const action = update.skipped
        ? "omitted"
        : update.match
          ? `matched to ${update.match.displayName}`
          : "kept without a cultivar match";

      if (nextPending) {
        setLiveAnnouncement(
          `${reviewedRow?.title ?? "Row"} ${action}. Moving to ${nextPending.title}.`,
        );
        setActiveReviewRowId(nextPending.id);
        setReviewQuery(nextPending.title);
        void loadCandidates(nextPending, nextPending.title);
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
    candidateResult,
    closeReview,
    configureSheet,
    currentStep,
    downloadResults,
    downloadTemplate,
    draftRows,
    duplicateCount,
    fileError,
    finishReviewRow,
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
    openReviewRow,
    parsedSpreadsheet,
    readingFile,
    rejectFile,
    resetImporter,
    resultRows,
    reviewQuery,
    selectedSheet,
    selectedSheetIndex,
    setReviewQuery,
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
