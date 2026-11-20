import type {
  CatalogColumnMapping,
  ParsedSpreadsheet,
} from "@/lib/catalog-importer";

export interface CatalogSpreadsheetInput {
  workbook: ParsedSpreadsheet;
  index: number;
  header: number | null;
  mapping: CatalogColumnMapping & { lists: number | null };
}

export interface CatalogInputDraft {
  input: "single" | "paste" | "spreadsheet";
  names: string;
  sheet: CatalogSpreadsheetInput | null;
}
