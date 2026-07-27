import type {
  CatalogColumnMapping,
  ParsedSpreadsheet,
  SpreadsheetCell,
} from "@/lib/catalog-importer";

const MAX_LOGGED_COLUMNS = 100;
const MAX_LOGGED_CELL_LENGTH = 500;

function serializeCell(cell: SpreadsheetCell | undefined) {
  if (cell === null || cell === undefined) return null;
  const value = cell instanceof Date ? cell.toISOString() : String(cell);
  return value.slice(0, MAX_LOGGED_CELL_LENGTH);
}

export function getCatalogImporterSubmissionSample({
  headerRowIndex,
  mapping,
  parsedSpreadsheet,
  selectedSheetIndex,
}: {
  headerRowIndex: number | null;
  mapping: CatalogColumnMapping;
  parsedSpreadsheet: ParsedSpreadsheet;
  selectedSheetIndex: number;
}) {
  const sheet = parsedSpreadsheet.sheets[selectedSheetIndex];
  if (!sheet) return null;

  const dataStart = headerRowIndex === null ? 0 : headerRowIndex + 1;
  const rows = sheet.rows
    .slice(dataStart)
    .filter((row) => row.some((cell) => serializeCell(cell)))
    .slice(0, 5)
    .map((row) =>
      row.slice(0, MAX_LOGGED_COLUMNS).map((cell) => serializeCell(cell)),
    );
  const header =
    headerRowIndex === null
      ? null
      : (sheet.rows[headerRowIndex] ?? [])
          .slice(0, MAX_LOGGED_COLUMNS)
          .map((cell) => serializeCell(cell));

  return {
    fileType: parsedSpreadsheet.fileName.toLowerCase().endsWith(".csv")
      ? "csv"
      : "xlsx",
    header,
    headerRowIndex,
    mapping,
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
  if (!sample) return;

  void fetch("/api/catalog-importer/submission-sample", {
    body: JSON.stringify(sample),
    headers: { "content-type": "application/json" },
    method: "POST",
    keepalive: true,
  }).catch(() => undefined);
}
