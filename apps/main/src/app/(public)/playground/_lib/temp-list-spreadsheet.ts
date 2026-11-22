import {
  cellToText,
  isCatalogListingSpreadsheet,
  parseCatalogListNames,
  suggestColumnMapping,
  type CatalogColumnMapping,
  type SpreadsheetSheet,
} from "@/lib/catalog-importer";
import {
  createTempListing,
  validateTempListingDraft,
  TEMP_LIST_CULTIVAR_HEADERS,
  type TempListing,
  type TempImportIssue,
  type TempInputBatch,
} from "./temp-list";

export type TempColumnMapping = CatalogColumnMapping & { lists: number | null };

export function suggestTempColumnMapping(
  sheet: SpreadsheetSheet,
  header: number | null,
): TempColumnMapping {
  const mapping = suggestColumnMapping(sheet.rows, header);
  const notes = getTempSheetColumns(sheet, header).filter(({ label }) =>
    /^notes?$/i.test(label),
  );
  if (mapping.privateNote === null && notes.length === 1)
    mapping.privateNote = notes[0]!.index;
  return { ...mapping, lists: mapping.lists ?? null };
}

export function getTempSheetColumns(
  sheet: SpreadsheetSheet,
  header: number | null,
) {
  const width = Math.max(0, ...sheet.rows.map((row) => row.length));
  const labels = Array.from({ length: width }, (_, index) =>
    header === null
      ? `Column ${index + 1}`
      : cellToText(sheet.rows[header]?.[index]) || `Column ${index + 1}`,
  );
  return labels.map((label, index) => ({
    index,
    label:
      labels.filter((value) => value === label).length > 1
        ? `${label} (column ${index + 1})`
        : label,
  }));
}

export function isTempListExport(columns: { label: string }[]) {
  return isCatalogListingSpreadsheet(columns.map(({ label }) => label));
}

export function readTempListSheet(
  sheet: SpreadsheetSheet,
  header: number | null,
  mapping: TempColumnMapping,
): TempInputBatch {
  if (mapping.title === null)
    throw new Error("Choose the column with cultivar names.");
  const columns = getTempSheetColumns(sheet, header);
  const listsColumn = mapping.lists;
  const exported = isTempListExport(columns);
  const derivedHeaders = new Set<string>([
    ...TEMP_LIST_CULTIVAR_HEADERS,
    "Cultivar URL",
  ]);
  const mapped = new Set([
    mapping.title,
    mapping.cultivarReferenceId,
    listsColumn,
    mapping.price,
    mapping.description,
    mapping.privateNote,
  ]);
  const listings: TempListing[] = [];
  const issues: TempImportIssue[] = [];
  sheet.rows.forEach((row, index) => {
    if (index <= (header ?? -1) || row.every((cell) => !cellToText(cell)))
      return;
    const name = String(row[mapping.title!] ?? "").trim();
    const parsed = validateTempListingDraft(
      {
        ...createTempListing(name),
        price: mapping.price === null ? "" : cellToText(row[mapping.price]),
        cultivarReferenceId:
          mapping.cultivarReferenceId === null
            ? null
            : cellToText(row[mapping.cultivarReferenceId]) || null,
        lists:
          listsColumn === null ? [] : parseCatalogListNames(row[listsColumn]),
        description:
          mapping.description === null
            ? ""
            : String(row[mapping.description] ?? ""),
        privateNote:
          mapping.privateNote === null
            ? ""
            : String(row[mapping.privateNote] ?? ""),
        extraFields: columns
          .filter(
            ({ index, label }) =>
              !mapped.has(index) && !(exported && derivedHeaders.has(label)),
          )
          .map(({ index, label }) => ({
            label:
              exported && label.startsWith("Imported: ")
                ? label.slice("Imported: ".length)
                : label,
            value:
              row[index] instanceof Date
                ? row[index].toISOString()
                : String(row[index] ?? ""),
          })),
      },
      index + 1,
      mapping.cultivarReferenceId !== null,
    );
    if (parsed.success) listings.push(parsed.listing);
    else issues.push({ ...parsed.issue, preserveNames: true });
  });
  return {
    listings,
    issues,
    preserveLinks: mapping.cultivarReferenceId !== null,
    preserveNames: true,
  };
}
