"use client";

import type {
  ParsedSpreadsheet,
  SpreadsheetCell,
  SpreadsheetSheet,
} from "@/lib/catalog-importer";
import { createSpreadsheetCsv, detectHeaderRow } from "@/lib/catalog-importer";

export const MAX_CATALOG_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CATALOG_IMPORT_ROWS_PER_SHEET = 5_000;

function parseCsv(text: string): SpreadsheetCell[][] {
  const rows: SpreadsheetCell[][] = [];
  let row: SpreadsheetCell[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? "";

    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && character === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (inQuotes) {
    throw new Error(
      "This CSV has an unclosed quote. Close the quoted cell in your spreadsheet and upload the file again.",
    );
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function trimEmptyTrailingRows(rows: SpreadsheetCell[][]) {
  let lastPopulatedIndex = rows.length - 1;
  while (
    lastPopulatedIndex >= 0 &&
    (rows[lastPopulatedIndex] ?? []).every(
      (cell) => cell === null || String(cell).trim().length === 0,
    )
  ) {
    lastPopulatedIndex -= 1;
  }

  return rows.slice(0, lastPopulatedIndex + 1);
}

function assertSheetSize(sheet: SpreadsheetSheet) {
  const header = detectHeaderRow(sheet.rows);
  const dataRowCount = sheet.rows.length - (header === null ? 0 : header + 1);
  if (dataRowCount > MAX_CATALOG_IMPORT_ROWS_PER_SHEET) {
    throw new Error(
      `${sheet.name} has more than ${MAX_CATALOG_IMPORT_ROWS_PER_SHEET.toLocaleString()} rows. Split the file into smaller sheets and try again.`,
    );
  }
}

export async function parseCatalogImportFile(
  file: File,
  { firstSheetOnly = false } = {},
): Promise<ParsedSpreadsheet> {
  if (file.size > MAX_CATALOG_IMPORT_FILE_BYTES) {
    throw new Error("Choose a spreadsheet smaller than 10 MB.");
  }

  const extension = file.name.split(".").at(-1)?.toLowerCase();
  let sheets: SpreadsheetSheet[];

  if (extension === "csv") {
    sheets = [
      {
        name: "CSV",
        rows: trimEmptyTrailingRows(parseCsv(await file.text())),
      },
    ];
  } else if (extension === "xlsx") {
    const reader = await import("read-excel-file/browser");
    const workbookSheets = firstSheetOnly
      ? [
          {
            sheet: "First sheet",
            data: await reader.readSheet(file, { trim: false }),
          },
        ]
      : await reader.default(file, { trim: false });
    sheets = workbookSheets.map((sheet) => ({
      name: sheet.sheet,
      rows: trimEmptyTrailingRows(sheet.data as SpreadsheetCell[][]),
    }));
  } else {
    throw new Error(
      "Use an .xlsx or .csv file. Older .xls files must be saved as .xlsx first.",
    );
  }

  if (sheets.length === 0 || sheets.every((sheet) => sheet.rows.length === 0)) {
    throw new Error("That spreadsheet does not contain any rows.");
  }

  for (const sheet of sheets) {
    assertSheetSize(sheet);
  }

  return {
    fileName: file.name,
    source: "upload",
    sheets,
  };
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadCatalogImportFile({
  fileName,
  spreadsheet,
}: {
  fileName: string;
  spreadsheet: ParsedSpreadsheet;
}) {
  if (fileName.toLowerCase().endsWith(".csv")) {
    const csv = createSpreadsheetCsv(spreadsheet.sheets[0]?.rows ?? []);
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      fileName,
    );
    return;
  }

  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(
    spreadsheet.sheets.map((sheet) => ({
      data: sheet.rows,
      dateFormat: "yyyy-mm-dd",
      sheet: sheet.name.slice(0, 31) || "Sheet",
    })),
  ).toFile(fileName);
}

export function getCatalogImporterDownloadFileName(
  fileName: string,
  kind: "clean" | "enriched",
) {
  const extension = fileName.toLowerCase().endsWith(".csv") ? "csv" : "xlsx";
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const safeName =
    baseName
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "daylily-catalog";

  return `${safeName}-${kind === "clean" ? "prepared-import" : "enhanced-original"}.${extension}`;
}
