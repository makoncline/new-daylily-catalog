import type {
  CatalogColumnMapping,
  ParsedSpreadsheet,
  SpreadsheetCell,
} from "@/lib/catalog-importer";

const MAX_LOGGED_COLUMNS = 30;
const MAX_LOGGED_CELL_LENGTH = 200;
const MAX_LOGGED_ROWS = 6;

function serializeCell(cell: SpreadsheetCell | undefined) {
  if (cell === null || cell === undefined) return null;
  const value = cell instanceof Date ? cell.toISOString() : String(cell);
  return value.slice(0, MAX_LOGGED_CELL_LENGTH);
}

export function getCatalogImporterSubmissionSample({
  headerRowIndex,
  importId,
  mapping,
  parsedSpreadsheet,
  resultCounts,
  selectedSheetIndex,
}: {
  headerRowIndex: number | null;
  importId: string;
  mapping: CatalogColumnMapping;
  parsedSpreadsheet: ParsedSpreadsheet;
  resultCounts: {
    issueCount: number;
    matchedCount: number;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    warningCount: number;
  };
  selectedSheetIndex: number;
}) {
  const sheet = parsedSpreadsheet.sheets[selectedSheetIndex];
  if (!sheet) return null;

  const rows = sheet.rows
    .map((row, index) => ({
      cells: row
        .slice(0, MAX_LOGGED_COLUMNS)
        .map((cell) => serializeCell(cell)),
      rowNumber: index + 1,
    }))
    .filter((row) => row.cells.some((cell) => cell !== null && cell !== ""))
    .slice(0, MAX_LOGGED_ROWS);

  return {
    fileType: parsedSpreadsheet.fileName.toLowerCase().endsWith(".csv")
      ? "csv"
      : "xlsx",
    headerRowIndex,
    importId,
    mapping,
    resultCounts,
    rows,
    sheetCount: parsedSpreadsheet.sheets.length,
    sheetName: sheet.name.slice(0, 100),
    source: parsedSpreadsheet.source ?? "upload",
  };
}

export function logCatalogImporterSubmissionSample(
  input: Parameters<typeof getCatalogImporterSubmissionSample>[0],
) {
  const sample = getCatalogImporterSubmissionSample(input);
  if (sample?.source !== "upload") return;

  void fetch("/api/catalog-importer/submission-sample", {
    body: JSON.stringify(sample),
    headers: { "content-type": "application/json" },
    method: "POST",
    keepalive: true,
  }).catch(() => undefined);
}
