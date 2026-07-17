"use client";

import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  RotateCcw,
  Search,
  SkipForward,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { TableImagePreview } from "@/components/data-table/table-image-preview";
import { TooltipCell } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CATALOG_IMPORT_PREVIEW_ROW_COUNT,
  CATALOG_IMPORT_PRO_MATCH_BATCH_SIZE,
  CATALOG_IMPORT_PUBLIC_MATCH_BATCH_SIZE,
  CATALOG_IMPORT_PUBLIC_SAMPLE_ROW_LIMIT,
} from "@/config/catalog-importer";
import {
  applyAutomaticCultivarMatches,
  columnIndexToLabel,
  createCatalogImportCsv,
  createCatalogImportRows,
  createCatalogImportTemplateCsv,
  detectHeaderRow,
  getAutomaticCultivarMatch,
  getHeaderRowSummary,
  getSourceColumns,
  suggestColumnMapping,
  type CatalogColumnMapping,
  type CatalogImportRow,
  type CultivarMatchCandidate,
  type CultivarNameMatchResult,
  type ParsedSpreadsheet,
} from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  readCatalogImporterDraft,
  writeCatalogImporterDraft,
  type CatalogImporterMode,
} from "@/lib/catalog-importer-draft";
import { parseCatalogImportFile } from "@/lib/catalog-importer-file";
import { normalizeCultivarName } from "@/lib/utils/cultivar-utils";
import type { OptimizedImageSource } from "@/components/optimized-image";

type MappingField = keyof CatalogColumnMapping;

interface CandidateResult {
  candidates: CultivarMatchCandidate[];
  error: string | null;
  loading: boolean;
  query: string;
  rowId: string;
}

const MAPPING_FIELDS: Array<{
  field: MappingField;
  label: string;
  required?: boolean;
}> = [
  {
    field: "title",
    label: "Cultivar name",
    required: true,
  },
  {
    field: "price",
    label: "Price",
  },
  {
    field: "description",
    label: "Description",
  },
  {
    field: "privateNote",
    label: "Private notes",
  },
  {
    field: "imageUrl",
    label: "Image URL",
  },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getSourcePreviewCellText(
  cell: ParsedSpreadsheet["sheets"][number]["rows"][number][number],
) {
  if (cell === null) {
    return "";
  }
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }
  return String(cell);
}

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

function getCultivarImage(
  candidate: CultivarMatchCandidate | null,
): OptimizedImageSource | null {
  if (!candidate?.imageUrl) {
    return null;
  }

  return {
    id: candidate.imageAsset?.id ?? candidate.cultivarReferenceId,
    imageAsset: candidate.imageAsset,
    url: candidate.imageUrl,
  };
}

function getUploadedImage(row: CatalogImportRow): OptimizedImageSource[] {
  return row.imageUrl ? [{ id: `uploaded-${row.id}`, url: row.imageUrl }] : [];
}

function getDownloadFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const safeName =
    baseName
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "daylily-catalog";

  return `${safeName}-cleaned.csv`;
}

function downloadCsv(fileName: string, rows: CatalogImportRow[]) {
  const csv = createCatalogImportCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getDownloadFileName(fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadTemplateCsv() {
  const blob = new Blob([createCatalogImportTemplateCsv()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "daylily-catalog-import-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getCandidateMeta(candidate: CultivarMatchCandidate) {
  return [candidate.hybridizer, candidate.year]
    .filter((value) => value !== null && value !== "")
    .join(" · ");
}

function getCultivarTraitSummary(candidate: CultivarMatchCandidate) {
  return [
    candidate.color,
    candidate.bloomSizeIn ? `${candidate.bloomSizeIn}" bloom` : null,
    candidate.scapeHeightIn ? `${candidate.scapeHeightIn}" scape` : null,
    candidate.form,
    candidate.ploidy,
    candidate.bloomSeason,
    candidate.rebloom ? "Reblooms" : null,
  ].filter((value): value is string => Boolean(value));
}

function MappingSelect({
  field,
  label,
  mapping,
  onChange,
  required,
  sourceColumns,
}: {
  field: MappingField;
  label: string;
  mapping: CatalogColumnMapping;
  onChange: (field: MappingField, value: number | null) => void;
  required?: boolean;
  sourceColumns: ReturnType<typeof getSourceColumns>;
}) {
  const value = mapping[field];

  return (
    <label className="grid gap-2 px-3 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
      <span className="text-muted-foreground block text-xs font-medium">
        {label}
        {required ? " *" : ""}
      </span>
      <Select
        value={value === null ? "none" : String(value)}
        onValueChange={(nextValue) =>
          onChange(field, nextValue === "none" ? null : Number(nextValue))
        }
      >
        <SelectTrigger className="bg-background h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="none">Do not import</SelectItem>
            {sourceColumns.map((column) => (
              <SelectItem key={column.index} value={String(column.index)}>
                {column.label}
                {column.preview ? ` — ${column.preview}` : ""}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  );
}

export function CatalogImporterWorkbench() {
  const [mode, setMode] = useState<CatalogImporterMode>("public");
  const [parsedSpreadsheet, setParsedSpreadsheet] =
    useState<ParsedSpreadsheet | null>(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [mapping, setMapping] = useState<CatalogColumnMapping>({
    description: null,
    imageUrl: null,
    price: null,
    privateNote: null,
    title: null,
  });
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
    useState<CandidateResult | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
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
  const activeRows =
    mode === "public" ? (matchedRows ?? []) : (matchedRows ?? draftRows);
  const visibleRows = activeRows
    .filter((row) => !row.skipped)
    .slice(0, CATALOG_IMPORT_PREVIEW_ROW_COUNT);
  const sourcePreviewRows =
    selectedSheet?.rows.slice(0, CATALOG_IMPORT_PREVIEW_ROW_COUNT) ?? [];
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

  function resetMatches() {
    setMatchedRows(null);
    setMatchedRowsKey(null);
    setMatchingProgress(null);
    setMatchError(null);
    setActiveReviewRowId(null);
    setReviewQuery("");
    setCandidateResult(null);
  }

  function resetImporter() {
    exactMatchRequestId.current += 1;
    candidateRequestId.current += 1;
    clearCatalogImporterDraft();
    setMode("public");
    setParsedSpreadsheet(null);
    setSelectedSheetIndex(0);
    setHeaderRowIndex(null);
    setMapping({
      description: null,
      imageUrl: null,
      price: null,
      privateNote: null,
      title: null,
    });
    setFileError(null);
    setReadingFile(false);
    resetMatches();
    setStorageWarning(null);
  }

  function handleModeChange(nextMode: string) {
    if (nextMode !== "public" && nextMode !== "pro") {
      return;
    }
    setMode(nextMode);
    resetMatches();
  }

  function configureSheet(spreadsheet: ParsedSpreadsheet, sheetIndex: number) {
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
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    setReadingFile(true);
    setFileError(null);

    try {
      const spreadsheet = await parseCatalogImportFile(file);
      setParsedSpreadsheet(spreadsheet);
      configureSheet(spreadsheet, 0);
    } catch (error) {
      setFileError(getErrorMessage(error));
    } finally {
      setReadingFile(false);
    }
  }

  function handleHeaderChange(value: string) {
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
  }

  function handleMappingChange(field: MappingField, value: number | null) {
    const nextMapping = { ...mapping, [field]: value };
    setMapping(nextMapping);
    resetMatches();
  }

  async function loadCandidates(row: CatalogImportRow, query: string) {
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
  }

  function openReviewRow(row: CatalogImportRow) {
    setActiveReviewRowId(row.id);
    setReviewQuery(row.title);
    void loadCandidates(row, row.title);
  }

  function finishReviewRow(
    rowId: string,
    update: Pick<CatalogImportRow, "match" | "matchStatus" | "skipped">,
  ) {
    if (!matchedRows) {
      return;
    }

    const nextRows = matchedRows.map((row) =>
      row.id === rowId ? { ...row, ...update } : row,
    );
    const nextPending = nextRows.find(
      (row) => !row.skipped && row.matchStatus === "pending",
    );

    setMatchedRows(nextRows);
    setCandidateResult(null);

    if (nextPending) {
      openReviewRow(nextPending);
    } else {
      setActiveReviewRowId(null);
      setReviewQuery("");
    }
  }

  return (
    <div className="min-h-screen bg-[#e7ebe3] text-[#142118]">
      <header className="border-b border-[#334239] bg-[#07120e] px-4 pt-24 pb-7 text-white lg:px-8">
        <div className="mx-auto max-w-[1280px]">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Clean a daylily spreadsheet
          </h1>
          <p className="mt-2 text-sm text-[#cbd7cd] sm:text-base">
            Upload a list. We’ll clean the names and link registered cultivars.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-2 py-4 sm:px-4">
        <div className="border border-[#89968c] bg-white">
          <div className="flex flex-col border-b border-[#89968c] bg-[#dce3d9] lg:flex-row lg:items-stretch">
            <label className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-[#89968c] px-4 text-sm font-semibold lg:border-r lg:border-b-0">
              {readingFile ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <UploadCloud className="size-4" />
              )}
              {readingFile ? "Reading file…" : "Open spreadsheet"}
              <input
                className="sr-only"
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={readingFile}
                onChange={handleFileChange}
              />
            </label>

            {parsedSpreadsheet ? (
              <>
                <div className="flex min-w-0 items-center gap-2 border-b border-[#89968c] px-4 text-sm lg:border-r lg:border-b-0">
                  <FileSpreadsheet className="size-4 shrink-0" />
                  <span className="truncate font-semibold">
                    {parsedSpreadsheet.fileName}
                  </span>
                </div>
                <label className="flex min-w-60 flex-1 items-center gap-2 border-b border-[#89968c] px-3 lg:border-r lg:border-b-0">
                  <span className="shrink-0 text-xs font-semibold">Sheet</span>
                  <Select
                    value={String(selectedSheetIndex)}
                    onValueChange={(value) =>
                      configureSheet(parsedSpreadsheet, Number(value))
                    }
                  >
                    <SelectTrigger className="h-8 rounded-none border-[#89968c] bg-white text-xs shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {parsedSpreadsheet.sheets.map((sheet, index) => (
                          <SelectItem key={sheet.name} value={String(index)}>
                            {sheet.name} · {sheet.rows.length.toLocaleString()}{" "}
                            rows
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>
              </>
            ) : (
              <div className="flex min-h-14 flex-1 items-center px-4 text-sm text-[#66746b]">
                XLSX or CSV · up to 5,000 rows
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-[#89968c] bg-[#f7f8f4] px-3 py-2">
            <ToggleGroup
              aria-label="Importer mode"
              onValueChange={handleModeChange}
              size="sm"
              type="single"
              value={mode}
              variant="outline"
            >
              <ToggleGroupItem value="public">Public</ToggleGroupItem>
              <ToggleGroupItem value="pro">Pro test</ToggleGroupItem>
            </ToggleGroup>
            <Button
              onClick={downloadTemplateCsv}
              size="sm"
              type="button"
              variant="outline"
            >
              <Download data-icon="inline-start" />
              Template
            </Button>
            <Button
              className="ml-auto"
              disabled={!parsedSpreadsheet}
              onClick={resetImporter}
              size="sm"
              type="button"
              variant="ghost"
            >
              <RotateCcw data-icon="inline-start" />
              Reset
            </Button>
          </div>

          {fileError ? (
            <p className="border-b border-[#89968c] bg-[#fff3ef] px-4 py-3 text-sm text-[#8f3f2e]">
              Could not read that spreadsheet: {fileError}
            </p>
          ) : null}

          {storageWarning ? (
            <p className="border-b border-[#89968c] bg-[#fff8e6] px-4 py-3 text-sm text-[#725417]">
              {storageWarning}
            </p>
          ) : null}

          {selectedSheet ? (
            <>
              <div className="flex items-baseline justify-between border-b border-[#89968c] bg-[#f7f8f4] px-3 py-2">
                <h2 className="text-sm font-semibold">Original</h2>
                <p className="text-xs text-[#66746b]">
                  {sourcePreviewRows.length} rows
                </p>
              </div>
              <div className="max-w-full overflow-x-auto border-b border-[#334239]">
                <table className="w-max border-collapse text-left text-xs">
                  <thead className="bg-[#dce3d9]">
                    <tr>
                      <th className="border-r border-b border-[#89968c] px-2 py-2 font-mono font-normal text-[#66746b]" />
                      {Array.from(
                        { length: sourcePreviewColumnCount },
                        (_, columnIndex) => (
                          <th
                            key={columnIndex}
                            className="border-r border-b border-[#89968c] px-2 py-2 font-mono font-normal whitespace-nowrap text-[#66746b] last:border-r-0"
                          >
                            {columnIndexToLabel(columnIndex)}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sourcePreviewRows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={
                          rowIndex === headerRowIndex
                            ? "bg-[#eef1e9] font-semibold"
                            : "bg-white"
                        }
                      >
                        <td className="border-r border-b border-[#c7cec5] px-2 py-2 font-mono text-[#66746b]">
                          {rowIndex + 1}
                        </td>
                        {Array.from(
                          { length: sourcePreviewColumnCount },
                          (_, columnIndex) => (
                            <td
                              key={columnIndex}
                              className="max-w-80 border-r border-b border-[#c7cec5] px-2 py-2 last:border-r-0"
                            >
                              <span className="line-clamp-3">
                                {getSourcePreviewCellText(
                                  row[columnIndex] ?? null,
                                )}
                              </span>
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-b px-3 py-3">
                <h2 className="text-sm font-semibold">Columns</h2>
              </div>
              <div className="border-b p-3">
                <div className="max-w-3xl divide-y rounded-md border">
                  <label className="grid gap-2 px-3 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
                    <span className="text-muted-foreground block text-xs font-medium">
                      Header row
                    </span>
                    <Select
                      value={
                        headerRowIndex === null
                          ? "none"
                          : String(headerRowIndex)
                      }
                      onValueChange={handleHeaderChange}
                    >
                      <SelectTrigger className="bg-background h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">
                            No header row — use column letters
                          </SelectItem>
                          {selectedSheet.rows
                            .slice(0, 12)
                            .map((row, rowIndex) => (
                              <SelectItem
                                key={rowIndex}
                                value={String(rowIndex)}
                              >
                                {getHeaderRowSummary(row, rowIndex)}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  {MAPPING_FIELDS.map((field) => (
                    <MappingSelect
                      key={field.field}
                      field={field.field}
                      label={field.label}
                      required={field.required}
                      mapping={mapping}
                      onChange={handleMappingChange}
                      sourceColumns={sourceColumns}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-b px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  <span>{draftRows.length.toLocaleString()} rows</span>
                  {skippedCount > 0 ? (
                    <span>{skippedCount.toLocaleString()} omitted</span>
                  ) : null}
                  {duplicateCount > 0 ? (
                    <span>{duplicateCount.toLocaleString()} duplicates</span>
                  ) : null}
                  {warningCount > 0 ? (
                    <span>
                      {warningCount.toLocaleString()} values need review
                    </span>
                  ) : null}
                </div>
                {matchingProgress ? (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <LoaderCircle className="animate-spin" />
                    Checking names ·{" "}
                    {matchingProgress.processed.toLocaleString()}/
                    {matchingProgress.total.toLocaleString()}
                  </span>
                ) : matchedRows ? (
                  <span className="text-muted-foreground">
                    {mode === "public"
                      ? `${matchedRows.length.toLocaleString()} matches`
                      : "Ready"}
                  </span>
                ) : null}
              </div>

              {mapping.title === null ? (
                <p className="border-b border-[#89968c] px-4 py-3 text-sm text-[#8f3f2e]">
                  Choose a cultivar-name column to build the cleaned table.
                </p>
              ) : null}

              {matchError ? (
                <p className="border-b border-[#89968c] bg-[#fff3ef] px-4 py-3 text-sm text-[#8f3f2e]">
                  Cultivar matching did not finish: {matchError}
                </p>
              ) : null}

              {mapping.title !== null && matchedRows !== null ? (
                <>
                  <div className="flex items-baseline justify-between border-b px-3 py-3">
                    <h2 className="font-semibold">
                      {mode === "public" ? "Matched sample" : "Cleaned list"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {visibleRows.length}/
                      {activeRows.filter((row) => !row.skipped).length}
                    </p>
                  </div>
                  <div className="border-b p-3">
                    <div className="rounded-md border">
                      <Table className="w-max table-auto">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            {mapping.price !== null ? (
                              <TableHead>Price</TableHead>
                            ) : null}
                            {mapping.description !== null ? (
                              <TableHead>Description</TableHead>
                            ) : null}
                            {mapping.privateNote !== null ? (
                              <TableHead>Private note</TableHead>
                            ) : null}
                            <TableHead>Cultivar image</TableHead>
                            <TableHead className="w-96 max-w-96 whitespace-normal">
                              Database description
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleRows.map((row) => {
                            const match = row.match;
                            const traits = match
                              ? getCultivarTraitSummary(match)
                              : [];
                            const cultivarReferenceImage =
                              getCultivarImage(match);
                            const uploadedImages = match
                              ? []
                              : getUploadedImage(row);

                            return (
                              <TableRow
                                key={row.id}
                                data-state={
                                  row.id === activeReviewRowId
                                    ? "selected"
                                    : undefined
                                }
                              >
                                <TableCell className="h-20 max-w-72 font-medium">
                                  <div>{match?.displayName ?? row.title}</div>
                                  {!match && matchedRows && mode === "pro" ? (
                                    <Button
                                      className="mt-1 h-auto p-0"
                                      onClick={() => openReviewRow(row)}
                                      size="sm"
                                      type="button"
                                      variant="link"
                                    >
                                      Choose cultivar match
                                    </Button>
                                  ) : null}
                                </TableCell>
                                {mapping.price !== null ? (
                                  <TableCell className="h-20 tabular-nums">
                                    {row.price === null
                                      ? (row.priceWarning ?? "")
                                      : `$${row.price}`}
                                  </TableCell>
                                ) : null}
                                {mapping.description !== null ? (
                                  <TableCell className="h-20 max-w-80">
                                    <TooltipCell
                                      content={row.description || null}
                                      lines={3}
                                    />
                                  </TableCell>
                                ) : null}
                                {mapping.privateNote !== null ? (
                                  <TableCell className="h-20 max-w-72">
                                    <TooltipCell
                                      content={row.privateNote || null}
                                      lines={2}
                                    />
                                  </TableCell>
                                ) : null}
                                <TableCell className="h-20 max-w-lg">
                                  {cultivarReferenceImage ||
                                  uploadedImages.length > 0 ? (
                                    <div className="size-16">
                                      <TableImagePreview
                                        images={uploadedImages}
                                        cultivarReferenceImage={
                                          cultivarReferenceImage
                                        }
                                      />
                                    </div>
                                  ) : null}
                                </TableCell>
                                <TableCell className="h-20 w-96 max-w-96 whitespace-normal">
                                  {match ? (
                                    <>
                                      <p className="font-medium">
                                        {match.displayName}
                                        {getCandidateMeta(match)
                                          ? ` · ${getCandidateMeta(match)}`
                                          : ""}
                                      </p>
                                      <span className="text-muted-foreground mt-1 line-clamp-3 block">
                                        {traits.join(" · ")}
                                      </span>
                                    </>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : null}

              {mode === "pro" && matchedRows && activeReviewRow ? (
                <section className="border-t">
                  <div className="bg-muted/20 flex flex-col gap-3 border-b px-3 py-3 lg:flex-row lg:items-center">
                    <div className="min-w-0 lg:w-80">
                      <p className="text-muted-foreground text-xs">
                        SOURCE ROW {activeReviewRow.sourceRow}
                      </p>
                      <h2 className="truncate text-base font-semibold">
                        Potential matches for {activeReviewRow.title}
                      </h2>
                    </div>
                    <form
                      className="flex min-w-0 flex-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void loadCandidates(activeReviewRow, reviewQuery);
                      }}
                    >
                      <Input
                        className="bg-background h-9 flex-1 rounded-r-none"
                        aria-label="Search a different cultivar spelling"
                        value={reviewQuery}
                        onChange={(event) =>
                          setReviewQuery(event.currentTarget.value)
                        }
                      />
                      <Button
                        className="h-9 rounded-l-none"
                        disabled={
                          candidateResult?.loading === true ||
                          reviewQuery.trim().length === 0
                        }
                        type="submit"
                      >
                        {candidateResult?.loading ? (
                          <LoaderCircle
                            className="animate-spin"
                            data-icon="inline-start"
                          />
                        ) : (
                          <Search data-icon="inline-start" />
                        )}
                        Search
                      </Button>
                    </form>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        finishReviewRow(activeReviewRow.id, {
                          match: null,
                          matchStatus: "pending",
                          skipped: true,
                        })
                      }
                    >
                      <SkipForward data-icon="inline-start" />
                      Omit row
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        finishReviewRow(activeReviewRow.id, {
                          match: null,
                          matchStatus: "unmatched",
                          skipped: false,
                        })
                      }
                    >
                      Keep without match
                    </Button>
                  </div>

                  {candidateResult?.error &&
                  candidateResult.rowId === activeReviewRow.id ? (
                    <p className="bg-destructive/10 text-destructive border-b px-3 py-2 text-sm">
                      {candidateResult.error}
                    </p>
                  ) : null}

                  <div className="p-3">
                    <div className="rounded-md border">
                      <Table className="w-max table-auto">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Photo</TableHead>
                            <TableHead>Registered cultivar</TableHead>
                            <TableHead>Hybridizer / year</TableHead>
                            <TableHead>Registry reference</TableHead>
                            <TableHead className="text-right">
                              Similarity
                            </TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {candidateResult?.loading &&
                          candidateResult.rowId === activeReviewRow.id ? (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-muted-foreground h-20"
                              >
                                Looking for close names…
                              </TableCell>
                            </TableRow>
                          ) : null}
                          {candidateResult &&
                          !candidateResult.loading &&
                          candidateResult.rowId === activeReviewRow.id &&
                          candidateResult.candidates.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-muted-foreground h-20"
                              >
                                No close cultivar names found. Try another
                                spelling or keep the row without a match.
                              </TableCell>
                            </TableRow>
                          ) : null}
                          {candidateResult?.rowId === activeReviewRow.id
                            ? candidateResult.candidates.map((candidate) => {
                                const candidateImage =
                                  getCultivarImage(candidate);

                                return (
                                  <TableRow key={candidate.cultivarReferenceId}>
                                    <TableCell className="h-20">
                                      {candidateImage ? (
                                        <div className="size-16">
                                          <TableImagePreview
                                            images={[]}
                                            cultivarReferenceImage={
                                              candidateImage
                                            }
                                          />
                                        </div>
                                      ) : null}
                                    </TableCell>
                                    <TableCell className="h-20 max-w-72 font-medium">
                                      {candidate.displayName}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground h-20">
                                      {getCandidateMeta(candidate)}
                                    </TableCell>
                                    <TableCell className="h-20 max-w-lg">
                                      <TooltipCell
                                        content={getCultivarTraitSummary(
                                          candidate,
                                        ).join(" · ")}
                                        lines={2}
                                      />
                                    </TableCell>
                                    <TableCell className="h-20 text-right tabular-nums">
                                      {candidate.confidence}%
                                    </TableCell>
                                    <TableCell className="h-20">
                                      <Button
                                        className="h-auto p-0"
                                        size="sm"
                                        type="button"
                                        variant="link"
                                        onClick={() =>
                                          finishReviewRow(activeReviewRow.id, {
                                            match: candidate,
                                            matchStatus: "selected",
                                            skipped: false,
                                          })
                                        }
                                      >
                                        Use match
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            : null}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </section>
              ) : null}

              {matchedRows && parsedSpreadsheet ? (
                <footer className="flex flex-col gap-3 border-t border-[#334239] bg-[#dce3d9] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-[#526057]">
                    {mode === "public"
                      ? `${matchedRows.length.toLocaleString()} matches from ${draftRows
                          .filter((row) => !row.skipped)
                          .length.toLocaleString()} rows`
                      : `${matchedRows
                          .filter((row) => !row.skipped)
                          .length.toLocaleString()} rows ready`}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      asChild
                      variant="outline"
                      className="h-9 rounded-none border-[#657268] bg-white px-4 text-xs shadow-none"
                    >
                      <Link href="/start-membership">
                        {mode === "public" ? "Import full list" : "Import list"}
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                    <Button
                      className="h-9 rounded-none bg-[#142118] px-4 text-xs text-white shadow-none hover:bg-[#263a2d]"
                      onClick={() =>
                        downloadCsv(parsedSpreadsheet.fileName, matchedRows)
                      }
                    >
                      <Download data-icon="inline-start" />
                      {mode === "public" ? "Download sample" : "Download CSV"}
                    </Button>
                  </div>
                </footer>
              ) : null}
            </>
          ) : (
            <div className="grid min-h-40 place-items-center">
              <p className="text-muted-foreground text-sm">
                Your spreadsheet stays in this browser.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
