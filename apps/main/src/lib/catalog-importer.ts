import {
  normalizeCultivarName,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";

export type SpreadsheetCell = string | number | boolean | Date | null;

export interface SpreadsheetSheet {
  name: string;
  rows: SpreadsheetCell[][];
}

export interface ParsedSpreadsheet {
  fileName: string;
  sheets: SpreadsheetSheet[];
}

export interface SourceColumn {
  index: number;
  label: string;
  preview: string;
}

export interface CatalogColumnMapping {
  description: number | null;
  imageUrl: number | null;
  price: number | null;
  privateNote: number | null;
  title: number | null;
}

export interface CultivarMatchCandidate {
  bloomSizeIn: number | null;
  bloomSeason: string | null;
  color: string | null;
  confidence: number;
  cultivarReferenceId: string;
  displayName: string;
  form: string | null;
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
  ploidy: string | null;
  rebloom: boolean | null;
  scapeHeightIn: number | null;
  year: number | null;
}

export interface CultivarNameMatchResult {
  candidates: CultivarMatchCandidate[];
  exactMatch: CultivarMatchCandidate | null;
  inputName: string;
  normalizedInput: string | null;
}

export function getAutomaticCultivarMatch(
  result: CultivarNameMatchResult,
): CultivarMatchCandidate | null {
  const confidentCandidates = result.candidates.filter(
    (candidate) => candidate.confidence > 90,
  );

  return confidentCandidates.length === 1 ? confidentCandidates[0]! : null;
}

export function applyAutomaticCultivarMatches({
  automaticMatches,
  limit,
  matchedOnly,
  rows,
}: {
  automaticMatches: ReadonlyMap<string, CultivarMatchCandidate>;
  limit?: number;
  matchedOnly: boolean;
  rows: CatalogImportRow[];
}) {
  const nextRows: CatalogImportRow[] = [];

  for (const row of rows) {
    if (row.skipped) {
      if (!matchedOnly) {
        nextRows.push(row);
      }
      continue;
    }

    const automaticMatch = automaticMatches.get(
      normalizeCultivarName(row.title) ?? "",
    );
    if (automaticMatch) {
      nextRows.push({
        ...row,
        match: automaticMatch,
        matchStatus: automaticMatch.confidence === 100 ? "exact" : "selected",
      });
    } else if (!matchedOnly) {
      nextRows.push(row);
    }

    if (limit !== undefined && nextRows.length >= limit) {
      break;
    }
  }

  return nextRows;
}

export type CatalogImportMatchStatus =
  | "exact"
  | "pending"
  | "selected"
  | "unmatched";

export interface CatalogImportRow {
  description: string;
  duplicateOfSourceRow: number | null;
  id: string;
  imageUrl: string;
  imageUrlWarning: string | null;
  match: CultivarMatchCandidate | null;
  matchStatus: CatalogImportMatchStatus;
  price: number | null;
  priceWarning: string | null;
  privateNote: string;
  skipped: boolean;
  sourceImageUrl: string;
  sourcePrice: string;
  sourceRow: number;
  sourceTitle: string;
  title: string;
}

const HEADER_PATTERNS = {
  description: [
    /^description$/,
    /^desc$/,
    /^details?$/,
    /^color(?: description)?$/,
  ],
  imageUrl: [
    /^image url$/,
    /^photo url$/,
    /^picture url$/,
    /^image$/,
    /^photo$/,
    /^picture$/,
    /^url$/,
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

const TRAILING_QUANTITY_PATTERN =
  /^(.*\S)\s+-\s+(\d+(?:\s*(?:[+&,/]|-|to)\s*\d+)*\s*\+?)$/i;
const SECTION_HEADING_PATTERN = /^(?:19|20)\d{2}$/;
const URL_PATTERN = /^https?:\/\//i;
const CATALOG_IMPORT_TEMPLATE_HEADERS = [
  "name",
  "price",
  "description",
  "private note",
  "image url",
] as const;
const PUBLIC_CULTIVAR_BASE_URL = "https://daylilycatalog.com/cultivar";

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

export function columnIndexToLabel(index: number) {
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
      fields.size >= 2 &&
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

export function getSourceColumns(
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
      preview: values.slice(0, 3).join(" · "),
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

function parsePriceValue(value: SpreadsheetCell | undefined) {
  const source = cellToText(value);
  if (!source) {
    return { price: null, source, warning: null };
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0
      ? { price: value, source, warning: null }
      : { price: null, source, warning: source };
  }

  const normalized = source.replaceAll(",", "").replace(/^\$/, "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { price: null, source, warning: source };
  }

  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0
    ? { price, source, warning: null }
    : { price: null, source, warning: source };
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
    templateHeaders.length === CATALOG_IMPORT_TEMPLATE_HEADERS.length &&
    CATALOG_IMPORT_TEMPLATE_HEADERS.every(
      (header, index) => templateHeaders[index] === header,
    );
  const mapping: CatalogColumnMapping = {
    description: isCatalogImportTemplate
      ? findHeaderMappedColumn("description", columns)
      : null,
    imageUrl: isCatalogImportTemplate
      ? findHeaderMappedColumn("imageUrl", columns)
      : null,
    price: isCatalogImportTemplate
      ? findHeaderMappedColumn("price", columns)
      : null,
    privateNote: isCatalogImportTemplate
      ? findHeaderMappedColumn("privateNote", columns)
      : null,
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

export function cleanCultivarTitle(sourceTitle: string) {
  const title = sourceTitle.trim().replace(/\s+/g, " ");
  const match = TRAILING_QUANTITY_PATTERN.exec(title);
  return match?.[1]?.trim() ?? title;
}

function getImageUrl(value: SpreadsheetCell | undefined) {
  const source = cellToText(value);
  if (!source) {
    return { imageUrl: "", source, warning: null };
  }

  if (!URL_PATTERN.test(source)) {
    return { imageUrl: "", source, warning: source };
  }

  try {
    const url = new URL(source);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { imageUrl: "", source, warning: source };
    }

    return { imageUrl: url.toString(), source, warning: null };
  } catch {
    return { imageUrl: "", source, warning: source };
  }
}

export function createCatalogImportRows({
  headerRowIndex,
  mapping,
  rows,
}: {
  headerRowIndex: number | null;
  mapping: CatalogColumnMapping;
  rows: SpreadsheetCell[][];
}): CatalogImportRow[] {
  if (mapping.title === null) {
    return [];
  }

  const dataStart = headerRowIndex === null ? 0 : headerRowIndex + 1;
  const result: CatalogImportRow[] = [];
  const firstSourceRowByNormalizedTitle = new Map<string, number>();

  for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const sourceTitle = cellToText(row[mapping.title]);
    if (!sourceTitle) {
      continue;
    }

    const title = cleanCultivarTitle(sourceTitle);
    if (!title) {
      continue;
    }

    const price = parsePriceValue(
      mapping.price === null ? undefined : row[mapping.price],
    );
    const image = getImageUrl(
      mapping.imageUrl === null ? undefined : row[mapping.imageUrl],
    );
    const description =
      mapping.description === null ? "" : cellToText(row[mapping.description]);
    const sourcePrivateNote =
      mapping.privateNote === null ? "" : cellToText(row[mapping.privateNote]);
    const sourceRow = rowIndex + 1;
    const normalizedTitle = normalizeCultivarName(title);
    const duplicateOfSourceRow = normalizedTitle
      ? (firstSourceRowByNormalizedTitle.get(normalizedTitle) ?? null)
      : null;

    if (normalizedTitle && duplicateOfSourceRow === null) {
      firstSourceRowByNormalizedTitle.set(normalizedTitle, sourceRow);
    }

    const hasMappedDetails = Boolean(
      price.source || description || sourcePrivateNote || image.source,
    );
    const skipped = SECTION_HEADING_PATTERN.test(title) && !hasMappedDetails;

    result.push({
      description,
      duplicateOfSourceRow,
      id: `source-row-${sourceRow}`,
      imageUrl: image.imageUrl,
      imageUrlWarning: image.warning,
      match: null,
      matchStatus: "pending",
      price: price.price,
      priceWarning: price.warning,
      privateNote: sourcePrivateNote,
      skipped,
      sourceImageUrl: image.source,
      sourcePrice: price.source,
      sourceRow,
      sourceTitle,
      title,
    });
  }

  return result;
}

function escapeCsv(value: string | number | null) {
  const stringValue = value === null ? "" : String(value);
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

export function createCatalogImportCsv(rows: CatalogImportRow[]) {
  const headers = [
    "name",
    "price",
    "description",
    "privateNote",
    "cultivarReferenceId",
    "cultivarUrl",
  ];
  const csvRows = rows
    .filter((row) => !row.skipped)
    .map((row) => {
      const outputTitle = row.match?.displayName ?? row.title;
      const cultivarSegment = toCultivarRouteSegment(row.match?.normalizedName);
      return [
        outputTitle,
        row.price,
        row.description,
        row.privateNote,
        row.match?.cultivarReferenceId ?? "",
        cultivarSegment ? `${PUBLIC_CULTIVAR_BASE_URL}/${cultivarSegment}` : "",
      ]
        .map((value) => escapeCsv(value === "" ? "" : value))
        .join(",");
    });

  return [headers.join(","), ...csvRows].join("\r\n");
}

export function createCatalogImportTemplateCsv() {
  return [
    CATALOG_IMPORT_TEMPLATE_HEADERS.join(","),
    [
      "Stella de Oro",
      "12.00",
      "Golden yellow reblooming daylily",
      "Front garden",
      "https://example.com/daylily.jpg",
    ]
      .map(escapeCsv)
      .join(","),
  ].join("\r\n");
}

export function getHeaderRowSummary(
  row: SpreadsheetCell[] | undefined,
  rowIndex: number,
) {
  const summary = (row ?? [])
    .map(cellToText)
    .filter(Boolean)
    .slice(0, 4)
    .join(" · ");

  return `Row ${rowIndex + 1}${summary ? `: ${summary}` : ""}`;
}
