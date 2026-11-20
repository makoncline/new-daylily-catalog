export const MAX_CULTIVAR_MATCH_NAME_LENGTH = 160;

export type SpreadsheetCell = string | number | boolean | Date | null;

export interface SpreadsheetSheet {
  name: string;
  rows: SpreadsheetCell[][];
}

export interface ParsedSpreadsheet {
  fileName: string;
  sheets: SpreadsheetSheet[];
}

interface SourceColumn {
  index: number;
  label: string;
}

export interface CatalogColumnMapping {
  lists?: number | null;
  cultivarReferenceId: number | null;
  description: number | null;
  price: number | null;
  privateNote: number | null;
  title: number | null;
}

export interface CultivarMatchCandidate {
  awardNames?: string | null;
  bloomHabit?: string | null;
  bloomSizeIn: number | null;
  bloomSeason: string | null;
  branches?: number | null;
  budCount?: number | null;
  color: string | null;
  confidence: number;
  cultivarReferenceId: string;
  displayName: string;
  foliageType?: string | null;
  flowerShow?: string | null;
  form: string | null;
  fragrance?: string | null;
  hybridizer: string | null;
  imageAsset: {
    blurUrl: string | null;
    displayUrl: string | null;
    id: string;
    originalUrl: string | null;
    status: string | null;
    thumbUrl: string | null;
  } | null;
  imageUrl: string | null;
  listingCount: number;
  normalizedName: string;
  parentage?: string | null;
  ploidy: string | null;
  rebloom: boolean | null;
  scapeHeightIn: number | null;
  sculptedTypes?: string | null;
  year: number | null;
}

export interface CultivarNameMatchResult {
  candidates: CultivarMatchCandidate[];
  exactMatch: CultivarMatchCandidate | null;
  inputCultivarReferenceId?: string | null;
  inputName: string;
  invalidCultivarReferenceId?: string | null;
  normalizedInput: string | null;
}

export interface CatalogImportPreparedListing {
  lists: string[];
  cultivarReferenceId: string | null;
  description: string | null;
  price: number | null;
  privateNote: string | null;
  title: string;
}

export const CATALOG_LISTING_HEADERS = [
  "Cultivar name",
  "Price",
  "Description",
  "Private note",
  "Lists",
  "Cultivar reference ID",
] as const;

export function normalizeCatalogListNames(names: readonly string[]) {
  const namesByKey = new Map<string, string>();
  for (const value of names) {
    const name = value.trim().replace(/\s+/g, " ");
    if (name && !namesByKey.has(name.toLowerCase())) {
      namesByKey.set(name.toLowerCase(), name);
    }
  }
  return [...namesByKey.values()];
}

export function parseCatalogListNames(value: SpreadsheetCell | undefined) {
  return normalizeCatalogListNames(String(value ?? "").split(/\r\n|\n|\r/));
}

export function createCatalogListingCells(
  listing: CatalogImportPreparedListing,
) {
  return [
    listing.title,
    listing.price,
    listing.description,
    listing.privateNote,
    normalizeCatalogListNames(listing.lists).join("\n"),
    listing.cultivarReferenceId,
  ];
}

export function isCatalogListingSpreadsheet(
  headers: readonly SpreadsheetCell[],
) {
  const labels = headers.map((cell) => cellToText(cell).toLowerCase());
  return [...CATALOG_LISTING_HEADERS, "Registered name"].every(
    (header) =>
      labels.filter((label) => label === header.toLowerCase()).length === 1,
  );
}

const HEADER_PATTERNS = {
  lists: [/^lists?$/],
  cultivarReferenceId: [
    /^daylily catalog id$/,
    /^cultivar reference id$/,
    /^cultivarreferenceid$/,
    /^daylily catalog cultivar id$/,
  ],
  description: [
    /^description$/,
    /^desc$/,
    /^details?$/,
    /^color(?: description)?$/,
  ],
  price: [/^price$/, /^cost$/, /^amount$/, /^\$$/],
  privateNote: [
    /^private notes?$/,
    /^notes?$/,
    /^location$/,
    /^garden$/,
    /^from$/,
    /^source$/,
    /^inventory$/,
    /^pedigree$/,
  ],
  title: [/^cultivar name$/, /^cultivar$/, /^variety$/, /^name$/, /^title$/],
} as const;

const URL_PATTERN = /^https?:\/\//i;
const CATALOG_IMPORT_TEMPLATE_HEADERS = [
  "name",
  "price",
  "description",
  "private note",
] as const;
function isBlankCell(cell: SpreadsheetCell | undefined) {
  return cell === null || cell === undefined || cellToText(cell).length === 0;
}

export function cellToText(cell: SpreadsheetCell | undefined): string {
  if (cell === null || cell === undefined) {
    return "";
  }

  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }

  return String(cell).trim().replace(/\s+/g, " ");
}

function getHeaderLabel(
  rows: SpreadsheetCell[][],
  headerRowIndex: number | null,
  columnIndex: number,
) {
  if (headerRowIndex === null) {
    return `Column ${columnIndexToLabel(columnIndex)}`;
  }

  return (
    cellToText(rows[headerRowIndex]?.[columnIndex]) ||
    `Column ${columnIndexToLabel(columnIndex)}`
  );
}

function columnIndexToLabel(index: number) {
  let label = "";
  let remaining = index + 1;

  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    remaining = Math.floor((remaining - 1) / 26);
  }

  return label;
}

function getHeaderField(label: string) {
  const normalized = label.trim().toLowerCase();

  for (const [field, patterns] of Object.entries(HEADER_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      return field as keyof typeof HEADER_PATTERNS;
    }
  }

  return null;
}

export function detectHeaderRow(rows: SpreadsheetCell[][]): number | null {
  let best:
    | {
        fieldCount: number;
        index: number;
        labeledCellCount: number;
      }
    | undefined;

  for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
    const row = rows[index] ?? [];
    const fields = new Set<string>();
    let labeledCellCount = 0;

    for (const cell of row) {
      const label = cellToText(cell);
      if (!label) {
        continue;
      }

      labeledCellCount += 1;
      const field = getHeaderField(label);
      if (field) {
        fields.add(field);
      }
    }

    if (
      (fields.size >= 2 || fields.has("title")) &&
      (!best ||
        fields.size > best.fieldCount ||
        (fields.size === best.fieldCount &&
          labeledCellCount > best.labeledCellCount))
    ) {
      best = {
        fieldCount: fields.size,
        index,
        labeledCellCount,
      };
    }
  }

  return best?.index ?? null;
}

function getSourceColumns(
  rows: SpreadsheetCell[][],
  headerRowIndex: number | null,
): SourceColumn[] {
  const maxColumns = rows.reduce(
    (largest, row) => Math.max(largest, row.length),
    0,
  );
  const dataStart = headerRowIndex === null ? 0 : headerRowIndex + 1;
  const dataRows = rows.slice(dataStart, dataStart + 500);
  const columns: SourceColumn[] = [];

  for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
    const headerValue =
      headerRowIndex === null
        ? ""
        : cellToText(rows[headerRowIndex]?.[columnIndex]);
    const values = dataRows
      .map((row) => cellToText(row[columnIndex]))
      .filter(Boolean);

    if (!headerValue && values.length < 2) {
      continue;
    }

    columns.push({
      index: columnIndex,
      label: getHeaderLabel(rows, headerRowIndex, columnIndex),
    });
  }

  return columns;
}

function getColumnValues(
  rows: SpreadsheetCell[][],
  headerRowIndex: number | null,
  columnIndex: number,
) {
  const dataStart = headerRowIndex === null ? 0 : headerRowIndex + 1;
  return rows
    .slice(dataStart, dataStart + 300)
    .map((row) => row[columnIndex])
    .filter((value) => !isBlankCell(value));
}

export function parsePriceValue(value: SpreadsheetCell | undefined) {
  const source = cellToText(value);
  if (!source) {
    return { price: null, warning: null };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return { price: null, warning: source };
    }

    return { price: value, warning: null };
  }

  if (
    ["-", "—", "n/a", "na", "nfs", "not for sale", "sold"].includes(
      source.toLowerCase(),
    )
  ) {
    return { price: null, warning: null };
  }

  const normalized = source.replaceAll(",", "").replace(/^\$/, "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { price: null, warning: source };
  }

  const price = Number(normalized);
  if (!Number.isFinite(price) || price < 0) {
    return { price: null, warning: source };
  }

  return { price, warning: null };
}

function getHeaderMatchScore(
  field: keyof typeof HEADER_PATTERNS,
  label: string,
) {
  const normalized = label.trim().toLowerCase();
  const matchIndex = HEADER_PATTERNS[field].findIndex((pattern) =>
    pattern.test(normalized),
  );

  return matchIndex === -1 ? -1 : 100 - matchIndex * 10;
}

function findHeaderMappedColumn(
  field: keyof typeof HEADER_PATTERNS,
  columns: SourceColumn[],
) {
  return (
    columns
      .map((column) => ({
        column,
        score: getHeaderMatchScore(field, column.label),
      }))
      .filter(({ score }) => score >= 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.column.index - right.column.index,
      )[0]?.column.index ?? null
  );
}

function findUniqueCanonicalHeaderColumn(
  field: "description" | "price" | "privateNote",
  columns: SourceColumn[],
) {
  const canonicalPattern = HEADER_PATTERNS[field][0];
  const matches = columns.filter((column) =>
    canonicalPattern.test(column.label.trim().toLowerCase()),
  );

  return matches.length === 1 ? (matches[0]?.index ?? null) : null;
}

function getColumnStats(
  rows: SpreadsheetCell[][],
  headerRowIndex: number | null,
  columnIndex: number,
) {
  const values = getColumnValues(rows, headerRowIndex, columnIndex);
  const textValues = values.map(cellToText);
  const numericValues = values.filter(
    (value) => parsePriceValue(value).warning === null,
  );
  const urlValues = textValues.filter((value) => URL_PATTERN.test(value));
  const uniqueValues = new Set(textValues.map((value) => value.toLowerCase()))
    .size;

  return {
    averageLength:
      textValues.reduce((sum, value) => sum + value.length, 0) /
      Math.max(textValues.length, 1),
    nonEmptyCount: values.length,
    numericRatio: numericValues.length / Math.max(values.length, 1),
    uniqueRatio: uniqueValues / Math.max(values.length, 1),
    urlRatio: urlValues.length / Math.max(values.length, 1),
  };
}

export function suggestColumnMapping(
  rows: SpreadsheetCell[][],
  headerRowIndex: number | null,
  columns = getSourceColumns(rows, headerRowIndex),
): CatalogColumnMapping {
  const templateHeaders =
    headerRowIndex === null
      ? []
      : columns.map((column) => column.label.trim().toLowerCase());
  const isCatalogImportTemplate =
    templateHeaders.length >= CATALOG_IMPORT_TEMPLATE_HEADERS.length &&
    CATALOG_IMPORT_TEMPLATE_HEADERS.every(
      (header, index) => templateHeaders[index] === header,
    );
  const mapping: CatalogColumnMapping = {
    lists: findHeaderMappedColumn("lists", columns),
    cultivarReferenceId: findHeaderMappedColumn("cultivarReferenceId", columns),
    description: isCatalogImportTemplate
      ? findHeaderMappedColumn("description", columns)
      : findUniqueCanonicalHeaderColumn("description", columns),
    price: isCatalogImportTemplate
      ? findHeaderMappedColumn("price", columns)
      : findUniqueCanonicalHeaderColumn("price", columns),
    privateNote: isCatalogImportTemplate
      ? findHeaderMappedColumn("privateNote", columns)
      : findUniqueCanonicalHeaderColumn("privateNote", columns),
    title: findHeaderMappedColumn("title", columns),
  };
  const stats = new Map(
    columns.map((column) => [
      column.index,
      getColumnStats(rows, headerRowIndex, column.index),
    ]),
  );

  mapping.title ??=
    columns
      .filter((column) => {
        const columnStats = stats.get(column.index);
        return (
          (columnStats?.numericRatio ?? 0) < 0.65 &&
          (columnStats?.urlRatio ?? 0) < 0.6
        );
      })
      .map((column) => {
        const columnStats = stats.get(column.index);
        return {
          index: column.index,
          score:
            Math.min(columnStats?.averageLength ?? 0, 40) / 20 +
            (columnStats?.uniqueRatio ?? 0) * 2 +
            Math.min(columnStats?.nonEmptyCount ?? 0, 50) / 100,
        };
      })
      .sort(
        (left, right) => right.score - left.score || left.index - right.index,
      )[0]?.index ?? null;

  return mapping;
}

function escapeCsv(value: SpreadsheetCell | undefined) {
  const stringValue = value === null ? "" : String(value);
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

export function createSpreadsheetCsv(rows: SpreadsheetCell[][]) {
  return rows
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\r\n");
}
