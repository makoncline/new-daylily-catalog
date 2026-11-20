import {
  normalizeCultivarName,
  toCultivarRouteSegment,
} from "@/lib/utils/cultivar-utils";

export const MAX_CULTIVAR_MATCH_NAME_LENGTH = 160;

export type SpreadsheetCell = string | number | boolean | Date | null;

export interface SpreadsheetSheet {
  name: string;
  rows: SpreadsheetCell[][];
}

export interface ParsedSpreadsheet {
  fileName: string;
  source?: "manual" | "sample" | "upload";
  sheets: SpreadsheetSheet[];
}

export interface SourceColumn {
  index: number;
  label: string;
  preview: string;
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
  cultivarReferenceMatches = new Map(),
  invalidCultivarReferenceIds = new Set(),
  rows,
  suggestedMatches,
}: {
  automaticMatches: ReadonlyMap<string, CultivarMatchCandidate>;
  cultivarReferenceMatches?: ReadonlyMap<string, CultivarMatchCandidate>;
  invalidCultivarReferenceIds?: ReadonlySet<string>;
  rows: CatalogImportRow[];
  suggestedMatches?: ReadonlyMap<string, CultivarMatchCandidate>;
}) {
  const nextRows: CatalogImportRow[] = [];

  for (const row of rows) {
    if (
      row.rowKind === "ignored" ||
      row.outputState === "removed" ||
      row.linkState === "intentionally-unmatched"
    ) {
      nextRows.push(row);
      continue;
    }

    const cultivarReferenceMatch = row.sourceCultivarReferenceId
      ? cultivarReferenceMatches.get(row.sourceCultivarReferenceId)
      : null;
    if (cultivarReferenceMatch) {
      nextRows.push({
        ...row,
        cultivarReferenceIdWarning: null,
        linkProvenance: "saved-id",
        linkState: "linked",
        match: cultivarReferenceMatch,
        suggestedMatch: cultivarReferenceMatch,
      });
      continue;
    }
    if (
      row.sourceCultivarReferenceId &&
      invalidCultivarReferenceIds.has(row.sourceCultivarReferenceId)
    ) {
      nextRows.push({
        ...row,
        cultivarReferenceIdWarning: row.sourceCultivarReferenceId,
        linkProvenance: null,
        linkState: "pending",
        match: null,
        suggestedMatch: null,
      });
      continue;
    }

    const normalizedTitle = normalizeCultivarName(row.title) ?? "";
    const automaticMatch = automaticMatches.get(normalizedTitle);
    const suggestedMatch =
      suggestedMatches?.get(normalizedTitle) ?? automaticMatch ?? null;
    if (automaticMatch) {
      nextRows.push({
        ...row,
        linkProvenance:
          automaticMatch.confidence === 100 ? "exact-name" : "automatic-name",
        linkState: "linked",
        match: automaticMatch,
        suggestedMatch,
      });
    } else {
      nextRows.push({
        ...row,
        linkProvenance: null,
        linkState: "pending",
        suggestedMatch,
      });
    }
  }

  return assignCatalogImportDuplicateGroups(nextRows);
}

export type CatalogImportRowKind = "ignored" | "listing";
export type CatalogImportOutputState = "included" | "removed";
export type CatalogImportLinkState =
  | "intentionally-unmatched"
  | "linked"
  | "pending";
export type CatalogImportLinkProvenance =
  | "automatic-name"
  | "exact-name"
  | "saved-id"
  | "user-confirmed";

export interface CatalogImportRow {
  extraFields?: { label: string; value: string }[];
  lists?: string[];
  cultivarReferenceIdWarning: string | null;
  description: string;
  duplicateAccepted: boolean;
  duplicateOfSourceRow: number | null;
  id: string;
  identityReviewed?: boolean;
  preserveTitle?: boolean;
  linkProvenance: CatalogImportLinkProvenance | null;
  linkState: CatalogImportLinkState;
  match: CultivarMatchCandidate | null;
  outputState: CatalogImportOutputState;
  price: number | null;
  priceWarning: string | null;
  privateNote: string;
  rowKind: CatalogImportRowKind;
  sourceCultivarReferenceId: string;
  sourcePrice: string;
  sourceRow: number;
  sourceTitle: string;
  suggestedMatch: CultivarMatchCandidate | null;
  title: string;
}

export type CatalogImportRowDisposition =
  | "excluded"
  | "review"
  | "issue"
  | "ready";

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

export function appendCatalogImportOriginalPriceNote(
  privateNote: string,
  sourcePrice: string,
) {
  if (!sourcePrice) {
    return privateNote;
  }

  const note = `Original price: ${sourcePrice}`;
  return privateNote.split("\n").includes(note)
    ? privateNote
    : [privateNote, note].filter(Boolean).join("\n");
}

export function hasCatalogImportBlockingIssue(row: CatalogImportRow) {
  return (
    row.cultivarReferenceIdWarning !== null ||
    (row.duplicateOfSourceRow !== null && !row.duplicateAccepted) ||
    row.priceWarning !== null
  );
}

export function getCatalogImportRowDisposition(
  row: CatalogImportRow,
): CatalogImportRowDisposition {
  if (row.rowKind !== "listing" || row.outputState === "removed") {
    return "excluded";
  }
  if (row.linkState === "pending" && row.cultivarReferenceIdWarning === null) {
    return "review";
  }
  if (hasCatalogImportBlockingIssue(row)) {
    return "issue";
  }

  return "ready";
}

export function prepareCatalogImportListing(
  row: CatalogImportRow,
): CatalogImportPreparedListing {
  return {
    lists: normalizeCatalogListNames(row.lists ?? []),
    cultivarReferenceId:
      row.linkState === "linked" && row.cultivarReferenceIdWarning === null
        ? (row.match?.cultivarReferenceId ?? row.sourceCultivarReferenceId) ||
          null
        : null,
    description: row.description.trim() || null,
    price: row.priceWarning === null ? row.price : null,
    privateNote:
      (row.priceWarning
        ? appendCatalogImportOriginalPriceNote(row.privateNote, row.sourcePrice)
        : row.privateNote
      ).trim() || null,
    title: row.preserveTitle
      ? row.title
      : (row.match?.displayName ?? row.title),
  };
}

function getDuplicateGroupKey(row: CatalogImportRow) {
  if (row.match?.cultivarReferenceId) {
    return `cultivar:${row.match.cultivarReferenceId}`;
  }

  const normalizedTitle = normalizeCultivarName(row.title);
  return normalizedTitle ? `name:${normalizedTitle}` : null;
}

export function assignCatalogImportDuplicateGroups(rows: CatalogImportRow[]) {
  const firstRowByGroup = new Map<string, CatalogImportRow>();

  return rows.map((row) => {
    if (row.rowKind === "ignored" || row.outputState === "removed") {
      return { ...row, duplicateOfSourceRow: null };
    }

    const groupKey = getDuplicateGroupKey(row);
    const firstRow = groupKey ? (firstRowByGroup.get(groupKey) ?? null) : null;
    const duplicateOfSourceRow =
      firstRow && !(firstRow.duplicateAccepted && row.duplicateAccepted)
        ? firstRow.sourceRow
        : null;

    if (groupKey && firstRow === null) {
      firstRowByGroup.set(groupKey, row);
    }

    return row.duplicateOfSourceRow === duplicateOfSourceRow
      ? row
      : { ...row, duplicateOfSourceRow };
  });
}

export function getCatalogImportState(
  rows: CatalogImportRow[],
  sourceRowCount = rows.length,
) {
  const detectedRows = rows.filter((row) => row.rowKind === "listing");
  const includedRows = detectedRows.filter(
    (row) => getCatalogImportRowDisposition(row) !== "excluded",
  );
  const linkedRows = includedRows.filter(
    (row) => row.linkState === "linked" && row.match !== null,
  );
  const reviewRows = includedRows
    .filter((row) => getCatalogImportRowDisposition(row) === "review")
    .sort(
      (left, right) =>
        (right.suggestedMatch?.confidence ?? -1) -
          (left.suggestedMatch?.confidence ?? -1) ||
        left.sourceRow - right.sourceRow,
    );
  const intentionallyUnmatchedRows = includedRows.filter(
    (row) => row.linkState === "intentionally-unmatched",
  );
  const savedIdIssueRows = includedRows.filter(
    (row) => row.cultivarReferenceIdWarning !== null,
  );
  const requiredDataDecisionRows = includedRows.filter(
    (row) => row.priceWarning !== null,
  );
  const warningRows = includedRows.filter(
    (row) => row.duplicateOfSourceRow !== null,
  );
  const duplicateGroupCount = new Set(
    includedRows
      .filter((row) => row.duplicateOfSourceRow !== null)
      .map((row) => row.duplicateOfSourceRow),
  ).size;
  const priceIssueCount = includedRows.filter(
    (row) => row.priceWarning !== null,
  ).length;
  const savedIdIssueCount = savedIdIssueRows.length;
  const uniqueMatches = [
    ...new Map(
      linkedRows.map((row) => [row.match!.cultivarReferenceId, row.match!]),
    ).values(),
  ];
  const registrationYears = uniqueMatches.flatMap((match) =>
    match.year === null ? [] : [match.year],
  );
  const searchableAttributeGetters = [
    (match: CultivarMatchCandidate) => match.awardNames,
    (match: CultivarMatchCandidate) => match.bloomHabit,
    (match: CultivarMatchCandidate) => match.bloomSizeIn,
    (match: CultivarMatchCandidate) => match.bloomSeason,
    (match: CultivarMatchCandidate) => match.branches,
    (match: CultivarMatchCandidate) => match.budCount,
    (match: CultivarMatchCandidate) => match.color,
    (match: CultivarMatchCandidate) => match.foliageType,
    (match: CultivarMatchCandidate) => match.flowerShow,
    (match: CultivarMatchCandidate) => match.form,
    (match: CultivarMatchCandidate) => match.fragrance,
    (match: CultivarMatchCandidate) => match.hybridizer,
    (match: CultivarMatchCandidate) => match.parentage,
    (match: CultivarMatchCandidate) => match.ploidy,
    (match: CultivarMatchCandidate) => match.rebloom,
    (match: CultivarMatchCandidate) => match.scapeHeightIn,
    (match: CultivarMatchCandidate) => match.sculptedTypes,
    (match: CultivarMatchCandidate) => match.year,
  ];
  const hasValue = (value: unknown) =>
    value !== null && value !== undefined && value !== "";
  const searchableAttributeCount = searchableAttributeGetters.filter(
    (getValue) => uniqueMatches.some((match) => hasValue(getValue(match))),
  ).length;
  const referencePhotoListingCount = linkedRows.filter((row) =>
    [
      row.match?.imageAsset?.thumbUrl,
      row.match?.imageAsset?.displayUrl,
      row.match?.imageAsset?.originalUrl,
      row.match?.imageUrl,
    ].some(hasValue),
  ).length;

  return {
    counts: {
      detectedListingCount: detectedRows.length,
      duplicateGroupCount,
      includedListingCount: includedRows.length,
      intentionallyUnmatchedCount: intentionallyUnmatchedRows.length,
      issueCount: requiredDataDecisionRows.length + savedIdIssueCount,
      linkedListingCount: linkedRows.length,
      pendingCultivarDecisionCount: reviewRows.length + savedIdIssueCount,
      priceIssueCount,
      requiredDataDecisionCount: requiredDataDecisionRows.length,
      reviewQueueCount: reviewRows.length,
      savedIdIssueCount,
      sourceRowCount,
      uniqueCultivarCount: uniqueMatches.length,
      warningCount: duplicateGroupCount,
    },
    detectedRows,
    enrichment: {
      awardWinningCultivarCount: uniqueMatches.filter((match) =>
        hasValue(match.awardNames),
      ).length,
      hybridizerCount: new Set(
        uniqueMatches.flatMap((match) =>
          match.hybridizer ? [match.hybridizer] : [],
        ),
      ).size,
      referencePhotoListingCount,
      registrationYearMax:
        registrationYears.length > 0 ? Math.max(...registrationYears) : null,
      registrationYearMin:
        registrationYears.length > 0 ? Math.min(...registrationYears) : null,
      searchableAttributeCount,
    },
    includedRows,
    intentionallyUnmatchedRows,
    linkedRows,
    requiredDataDecisionRows,
    reviewRows,
    savedIdIssueRows,
    sourceRows: rows,
    warningRows,
  };
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

const TRAILING_QUANTITY_PATTERN =
  /^(.*\S)\s+-\s+(\d+(?:\s*(?:[+&,/]|-|to)\s*\d+)*\s*\+?)$/i;
const SECTION_HEADING_PATTERN = /^(?:19|20)\d{2}$/;
const URL_PATTERN = /^https?:\/\//i;
const CATALOG_IMPORT_TEMPLATE_HEADERS = [
  "name",
  "price",
  "description",
  "private note",
] as const;
const CATALOG_MAPPED_OUTPUT_HEADERS = {
  lists: "Lists",
  description: "Description",
  price: "Price",
  privateNote: "Private note",
  title: "Cultivar name",
} as const;
const CATALOG_IMPORT_DISPLAY_HEADERS: Record<
  keyof CatalogColumnMapping,
  string
> = {
  lists: CATALOG_MAPPED_OUTPUT_HEADERS.lists,
  cultivarReferenceId: "Cultivar reference ID",
  description: CATALOG_MAPPED_OUTPUT_HEADERS.description,
  price: CATALOG_MAPPED_OUTPUT_HEADERS.price,
  privateNote: CATALOG_MAPPED_OUTPUT_HEADERS.privateNote,
  title: CATALOG_MAPPED_OUTPUT_HEADERS.title,
};

export function getCatalogImportMappedColumnLabel(
  mapping: CatalogColumnMapping,
  columnIndex: number,
) {
  const mappedField = (
    Object.keys(CATALOG_IMPORT_DISPLAY_HEADERS) as Array<
      keyof CatalogColumnMapping
    >
  ).find((field) => mapping[field] === columnIndex);

  return mappedField === undefined
    ? null
    : CATALOG_IMPORT_DISPLAY_HEADERS[mappedField];
}

export function getCatalogImportOrderedColumnIndexes(
  mapping: CatalogColumnMapping,
  columnIndexes: number[],
) {
  const availableColumnIndexes = new Set(columnIndexes);
  const mappedColumnIndexes = [
    mapping.title,
    mapping.price,
    mapping.description,
    mapping.privateNote,
    mapping.lists,
    mapping.cultivarReferenceId,
  ].filter(
    (columnIndex): columnIndex is number =>
      columnIndex !== null &&
      columnIndex !== undefined &&
      availableColumnIndexes.has(columnIndex),
  );
  const uniqueMappedColumnIndexes = [...new Set(mappedColumnIndexes)];
  const mappedColumnIndexSet = new Set(uniqueMappedColumnIndexes);

  return [
    ...uniqueMappedColumnIndexes,
    ...columnIndexes.filter(
      (columnIndex) => !mappedColumnIndexSet.has(columnIndex),
    ),
  ];
}
const DAYLILY_CATALOG_BASE_URL = "https://daylilycatalog.com";
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

export function parsePriceValue(value: SpreadsheetCell | undefined) {
  const source = cellToText(value);
  if (!source) {
    return { price: null, source, warning: null };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return { price: null, source, warning: source };
    }

    return { price: value, source, warning: null };
  }

  if (
    ["-", "—", "n/a", "na", "nfs", "not for sale", "sold"].includes(
      source.toLowerCase(),
    )
  ) {
    return { price: null, source, warning: null };
  }

  const normalized = source.replaceAll(",", "").replace(/^\$/, "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { price: null, source, warning: source };
  }

  const price = Number(normalized);
  if (!Number.isFinite(price) || price < 0) {
    return { price: null, source, warning: source };
  }

  return { price, source, warning: null };
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

export function cleanCultivarTitle(sourceTitle: string) {
  const title = sourceTitle.trim().replace(/\s+/g, " ");
  const match = TRAILING_QUANTITY_PATTERN.exec(title);
  return match?.[1]?.trim() ?? title;
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
  const headers = headerRowIndex === null ? [] : (rows[headerRowIndex] ?? []);
  const preserveTitle =
    isCatalogListingSpreadsheet(headers) &&
    cellToText(headers[mapping.title]).toLowerCase() === "cultivar name" &&
    mapping.cultivarReferenceId !== null &&
    cellToText(headers[mapping.cultivarReferenceId]).toLowerCase() ===
      "cultivar reference id";

  for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const sourceTitle = cellToText(row[mapping.title]);
    if (!sourceTitle) {
      continue;
    }

    const title = preserveTitle
      ? String(row[mapping.title] ?? "").trim()
      : cleanCultivarTitle(sourceTitle);
    if (!title) {
      continue;
    }

    const price = parsePriceValue(
      mapping.price === null ? undefined : row[mapping.price],
    );
    const description =
      mapping.description === null
        ? ""
        : String(row[mapping.description] ?? "").trim();
    const sourcePrivateNote =
      mapping.privateNote === null
        ? ""
        : String(row[mapping.privateNote] ?? "").trim();
    const sourceCultivarReferenceId =
      mapping.cultivarReferenceId === null
        ? ""
        : cellToText(row[mapping.cultivarReferenceId]);
    const sourceRow = rowIndex + 1;

    const hasMappedDetails = Boolean(
      price.source || description || sourcePrivateNote,
    );
    const rowKind =
      !preserveTitle && SECTION_HEADING_PATTERN.test(title) && !hasMappedDetails
        ? "ignored"
        : "listing";

    result.push({
      lists: parseCatalogListNames(
        mapping.lists === null || mapping.lists === undefined
          ? undefined
          : row[mapping.lists],
      ),
      cultivarReferenceIdWarning: null,
      description,
      duplicateAccepted: false,
      duplicateOfSourceRow: null,
      id: `source-row-${sourceRow}`,
      ...(preserveTitle ? { preserveTitle: true } : {}),
      linkProvenance: null,
      linkState:
        preserveTitle && !sourceCultivarReferenceId
          ? "intentionally-unmatched"
          : "pending",
      match: null,
      outputState: "included",
      price: price.price,
      priceWarning: price.warning,
      privateNote: sourcePrivateNote,
      rowKind,
      sourceCultivarReferenceId,
      sourcePrice: price.source,
      sourceRow,
      sourceTitle,
      suggestedMatch: null,
      title,
    });
  }

  return assignCatalogImportDuplicateGroups(result);
}

export function escapeCsv(value: SpreadsheetCell | undefined) {
  const stringValue = value === null ? "" : String(value);
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

export function getCultivarUrl(candidate: CultivarMatchCandidate | null) {
  const segment = toCultivarRouteSegment(candidate?.normalizedName);
  return segment ? `${DAYLILY_CATALOG_BASE_URL}/cultivar/${segment}` : "";
}

export function createSpreadsheetCsv(rows: SpreadsheetCell[][]) {
  return rows
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\r\n");
}
