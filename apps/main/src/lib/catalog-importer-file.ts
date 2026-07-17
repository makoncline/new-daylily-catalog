"use client";

import type {
  ParsedSpreadsheet,
  SpreadsheetCell,
  SpreadsheetSheet,
} from "@/lib/catalog-importer";

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
  if (sheet.rows.length > MAX_CATALOG_IMPORT_ROWS_PER_SHEET) {
    throw new Error(
      `${sheet.name} has more than ${MAX_CATALOG_IMPORT_ROWS_PER_SHEET.toLocaleString()} rows. Split the file into smaller sheets and try again.`,
    );
  }
}

export async function parseCatalogImportFile(
  file: File,
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
    const { default: readExcelFile } = await import("read-excel-file/browser");
    const workbookSheets = await readExcelFile(file);
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
    sheets,
  };
}
