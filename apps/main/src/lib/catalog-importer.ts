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
  cultivarReferenceId: number | null;
  description: number | null;
  imageUrl: number | null;
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
    if (row.rowKind === "ignored" || row.outputState === "removed") {
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
  cultivarReferenceIdWarning: string | null;
  description: string;
  duplicateAccepted: boolean;
  duplicateOfSourceRow: number | null;
  id: string;
  imageUrl: string;
  imageUrlWarning: string | null;
  linkProvenance: CatalogImportLinkProvenance | null;
  linkState: CatalogImportLinkState;
  match: CultivarMatchCandidate | null;
  outputState: CatalogImportOutputState;
  price: number | null;
  priceWarning: string | null;
  privateNote: string;
  rowKind: CatalogImportRowKind;
  sourceCultivarReferenceId: string;
  sourceImageUrl: string;
  sourcePrice: string;
  sourceRow: number;
  sourceTitle: string;
  suggestedMatch: CultivarMatchCandidate | null;
  title: string;
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
    (row) => row.outputState === "included",
  );
  const linkedRows = includedRows.filter(
    (row) => row.linkState === "linked" && row.match !== null,
  );
  const reviewRows = includedRows.filter(
    (row) =>
      row.linkState === "pending" &&
      row.match === null &&
      row.cultivarReferenceIdWarning === null,
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
    (row) => row.duplicateOfSourceRow !== null || row.imageUrlWarning !== null,
  );
  const duplicateGroupCount = new Set(
    includedRows
      .filter((row) => row.duplicateOfSourceRow !== null)
      .map((row) => row.duplicateOfSourceRow),
  ).size;
  const priceIssueCount = includedRows.filter(
    (row) => row.priceWarning !== null,
  ).length;
  const imageIssueCount = includedRows.filter(
    (row) => row.imageUrlWarning !== null,
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
      imageIssueCount,
      includedListingCount: includedRows.length,
      intentionallyUnmatchedCount: intentionallyUnmatchedRows.length,
      issueCount:
        duplicateGroupCount +
        priceIssueCount +
        imageIssueCount +
        savedIdIssueCount,
      linkedListingCount: linkedRows.length,
      pendingCultivarDecisionCount: reviewRows.length + savedIdIssueCount,
      priceIssueCount,
      requiredDataDecisionCount: requiredDataDecisionRows.length,
      reviewQueueCount: reviewRows.length,
      savedIdIssueCount,
      sourceRowCount,
      uniqueCultivarCount: uniqueMatches.length,
      warningCount: duplicateGroupCount + imageIssueCount,
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
const CATALOG_ENRICHMENT_HEADERS = {
  cultivarReferenceId: "Daylily Catalog ID",
  registeredCultivarName: "Daylily Catalog Cultivar Name",
  cultivarUrl: "Daylily Catalog Cultivar URL",
} as const;
const LEGACY_CATALOG_ENRICHMENT_HEADERS = {
  cultivarReferenceId: [
    "cultivar reference id",
    "cultivarreferenceid",
    "daylily catalog cultivar id",
  ],
  registeredCultivarName: [
    "registered cultivar name",
    "registeredcultivarname",
  ],
  cultivarUrl: ["cultivar url", "cultivarurl"],
} as const;
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
    templateHeaders.length >= CATALOG_IMPORT_TEMPLATE_HEADERS.length &&
    CATALOG_IMPORT_TEMPLATE_HEADERS.every(
      (header, index) => templateHeaders[index] === header,
    );
  const mapping: CatalogColumnMapping = {
    cultivarReferenceId: findHeaderMappedColumn("cultivarReferenceId", columns),
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
    const sourceCultivarReferenceId =
      mapping.cultivarReferenceId === null
        ? ""
        : cellToText(row[mapping.cultivarReferenceId]);
    const sourceRow = rowIndex + 1;

    const hasMappedDetails = Boolean(
      price.source || description || sourcePrivateNote || image.source,
    );
    const rowKind =
      SECTION_HEADING_PATTERN.test(title) && !hasMappedDetails
        ? "ignored"
        : "listing";

    result.push({
      cultivarReferenceIdWarning: null,
      description,
      duplicateAccepted: false,
      duplicateOfSourceRow: null,
      id: `source-row-${sourceRow}`,
      imageUrl: image.imageUrl,
      imageUrlWarning: image.warning,
      linkProvenance: null,
      linkState: "pending",
      match: null,
      outputState: "included",
      price: price.price,
      priceWarning: price.warning,
      privateNote: sourcePrivateNote,
      rowKind,
      sourceCultivarReferenceId,
      sourceImageUrl: image.source,
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

function cloneSheetRows(rows: SpreadsheetCell[][]) {
  return rows.map((row) => [...row]);
}

function getMaxColumnCount(rows: SpreadsheetCell[][]) {
  return rows.reduce((largest, row) => Math.max(largest, row.length), 0);
}

function ensureEnrichmentColumns(
  rows: SpreadsheetCell[][],
  headerRowIndex: number,
) {
  const headerRow = rows[headerRowIndex] ?? [];
  rows[headerRowIndex] = headerRow;
  let nextColumnIndex = getMaxColumnCount(rows);

  return Object.fromEntries(
    Object.entries(CATALOG_ENRICHMENT_HEADERS).map(([field, header]) => {
      const canonicalIndex = headerRow.findIndex(
        (cell) => cellToText(cell).toLowerCase() === header.toLowerCase(),
      );
      const legacyHeaders: readonly string[] =
        LEGACY_CATALOG_ENRICHMENT_HEADERS[
          field as keyof typeof LEGACY_CATALOG_ENRICHMENT_HEADERS
        ];
      const legacyIndex = headerRow.findIndex((cell) =>
        legacyHeaders.includes(cellToText(cell).toLowerCase()),
      );
      const existingIndex = canonicalIndex >= 0 ? canonicalIndex : legacyIndex;
      const index = existingIndex >= 0 ? existingIndex : nextColumnIndex++;
      headerRow[index] = header;
      return [field, index];
    }),
  ) as Record<keyof typeof CATALOG_ENRICHMENT_HEADERS, number>;
}

export function getCultivarUrl(candidate: CultivarMatchCandidate | null) {
  const segment = toCultivarRouteSegment(candidate?.normalizedName);
  return segment ? `${DAYLILY_CATALOG_BASE_URL}/cultivar/${segment}` : "";
}

export function createCatalogEnrichedSpreadsheet({
  headerRowIndex,
  mapping,
  matchedRows,
  parsedSpreadsheet,
  selectedSheetIndex,
}: {
  headerRowIndex: number | null;
  mapping: CatalogColumnMapping;
  matchedRows: CatalogImportRow[];
  parsedSpreadsheet: ParsedSpreadsheet;
  selectedSheetIndex: number;
}): ParsedSpreadsheet {
  const sheets = parsedSpreadsheet.sheets.map((sheet) => ({
    ...sheet,
    rows: cloneSheetRows(sheet.rows),
  }));
  const selectedSheet = sheets[selectedSheetIndex];
  if (!selectedSheet) {
    return { ...parsedSpreadsheet, sheets };
  }

  const originalRows = selectedSheet.rows;
  let outputHeaderRowIndex = headerRowIndex;
  let insertedHeaderRow = false;

  if (outputHeaderRowIndex === null) {
    const firstRow = originalRows[0] ?? [];
    const firstRowIsBlank = firstRow.every((cell) => isBlankCell(cell));
    if (firstRowIsBlank) {
      outputHeaderRowIndex = 0;
      const sourceColumnCount = getMaxColumnCount(originalRows);
      originalRows[0] = Array.from(
        { length: sourceColumnCount },
        (_, index) => `Column ${columnIndexToLabel(index)}`,
      );
    } else {
      const sourceColumnCount = getMaxColumnCount(originalRows);
      originalRows.unshift(
        Array.from(
          { length: sourceColumnCount },
          (_, index) => `Column ${columnIndexToLabel(index)}`,
        ),
      );
      outputHeaderRowIndex = 0;
      insertedHeaderRow = true;
    }
  }

  const enrichmentColumns = ensureEnrichmentColumns(
    originalRows,
    outputHeaderRowIndex,
  );
  const removedSourceRows = new Set(
    matchedRows
      .filter((row) => row.outputState === "removed")
      .map((row) => row.sourceRow),
  );

  for (const row of matchedRows) {
    if (row.outputState === "removed") {
      continue;
    }

    const outputRowIndex = row.sourceRow - 1 + (insertedHeaderRow ? 1 : 0);
    const outputRow = originalRows[outputRowIndex] ?? [];
    originalRows[outputRowIndex] = outputRow;

    if (mapping.title !== null && row.match) {
      outputRow[mapping.title] = row.match.displayName;
    }
    if (mapping.price !== null && row.priceWarning === null) {
      outputRow[mapping.price] = row.price ?? "";
    }
    if (mapping.description !== null) {
      outputRow[mapping.description] = row.description;
    }
    if (mapping.privateNote !== null) {
      outputRow[mapping.privateNote] = row.privateNote;
    }
    if (mapping.imageUrl !== null && row.imageUrlWarning === null) {
      outputRow[mapping.imageUrl] = row.imageUrl;
    }

    outputRow[enrichmentColumns.cultivarReferenceId] =
      row.cultivarReferenceIdWarning === null
        ? (row.match?.cultivarReferenceId ?? row.sourceCultivarReferenceId)
        : "";
    outputRow[enrichmentColumns.registeredCultivarName] =
      row.match?.displayName ?? "";
    outputRow[enrichmentColumns.cultivarUrl] = getCultivarUrl(row.match);
  }

  selectedSheet.rows = originalRows.filter((_, outputRowIndex) => {
    if (outputRowIndex === outputHeaderRowIndex) {
      return true;
    }
    const sourceRow = outputRowIndex + 1 - (insertedHeaderRow ? 1 : 0);
    return !removedSourceRows.has(sourceRow);
  });

  return {
    ...parsedSpreadsheet,
    sheets,
  };
}

export function createSpreadsheetCsv(rows: SpreadsheetCell[][]) {
  return rows
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\r\n");
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

export function createCatalogImportSampleSpreadsheet(): ParsedSpreadsheet {
  return {
    fileName: "Sample daylily catalog.csv",
    sheets: [
      {
        name: "Sample catalog",
        rows: [
          ["name", "price", "description", "private note", "image url"],
          [
            "Stella de Oro",
            "12.00",
            "Golden yellow rebloomer",
            "Front border",
            "",
          ],
          [
            "Happy Returns",
            "15.00",
            "Soft yellow fragrant flowers",
            "Display row",
            "",
          ],
          [
            "Ruby Spider",
            "18.00",
            "Large ruby red unusual form",
            "North bed",
            "",
          ],
          [
            "Primal Scream",
            "20.00",
            "Bright tangerine unusual form",
            "Feature bed",
            "",
          ],
          ["Orange Velvet", "16.00", "Rich orange self", "South border", ""],
          [
            "Action Figure",
            "24.00",
            "Pleated sculpted form",
            "New introductions",
            "",
          ],
          [
            "My Favorite Martian",
            "28.00",
            "Cristate extra-large bloom",
            "Seedling garden",
            "",
          ],
          [
            "Vanguard 2",
            "22.00",
            "Name needs confirmation",
            "Holding area",
            "",
          ],
          ["Stella de Oro", "10.00", "Second-size division", "Pot row", ""],
          [
            "Aerial Art",
            "two for $30",
            "Graceful unusual form",
            "Price needs cleanup",
            "",
          ],
        ],
      },
    ],
  };
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
