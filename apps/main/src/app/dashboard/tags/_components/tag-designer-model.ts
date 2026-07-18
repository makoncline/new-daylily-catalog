"use client";

import qrcodeGenerator from "qrcode-generator";

const ALL_FIELD_IDS = [
  "title",
  "hybridizerYear",
  "hybridizer",
  "year",
  "price",
  "ploidy",
  "bloomSize",
  "scapeHeight",
  "bloomSeason",
  "bloomHabit",
  "color",
  "form",
  "foliageType",
  "fragrance",
  "budcount",
  "branches",
  "parentage",
  "sculpting",
  "foliage",
  "flower",
  "privateNote",
  "listName",
  "customText",
] as const;

export type TagFieldId = (typeof ALL_FIELD_IDS)[number];
type TagTextAlign = "left" | "center" | "right";

interface TagAhsListingData {
  hybridizer?: string | null;
  year?: string | number | null;
  bloomSize?: string | null;
  scapeHeight?: string | null;
  bloomSeason?: string | null;
  ploidy?: string | null;
  foliageType?: string | null;
  bloomHabit?: string | null;
  color?: string | null;
  form?: string | null;
  parentage?: string | null;
  fragrance?: string | null;
  budcount?: string | null;
  branches?: string | null;
  sculpting?: string | null;
  foliage?: string | null;
  flower?: string | null;
}

export interface TagListingData {
  id: string;
  userId?: string | null;
  title: string;
  price?: number | null;
  privateNote?: string | null;
  listName?: string | null;
  ahsListing?: TagAhsListingData | null;
}

const DEFAULT_LISTING: TagListingData = {
  id: "__placeholder__",
  userId: "example-garden-user",
  title: "Sample Cultivar Name",
  price: 12.99,
  privateNote: "Example note",
  listName: "For Sale",
  ahsListing: {
    hybridizer: "Smith",
    year: "2023",
    bloomSize: '6"',
    scapeHeight: '28"',
    bloomSeason: "E-M",
    ploidy: "Tet",
    bloomHabit: "Dormant",
    color: "Yellow",
    form: "Single",
    foliageType: "Dormant",
  },
};

interface TagSizePreset {
  id: string;
  label: string;
  widthInches: number;
  heightInches: number;
}

export interface TagCell {
  fieldId: TagFieldId;
  width: number;
  textAlign: TagTextAlign;
  fontSize: number;
  overflow: boolean;
  fit: boolean;
  wrap: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  label: string;
}

export interface TagRow {
  id: string;
  cells: TagCell[];
  isSpacer?: boolean;
}

export interface TagDesignerState {
  sizePresetId: string;
  customWidthInches: number;
  customHeightInches: number;
  showQrCode: boolean;
  rows: TagRow[];
}

export interface TagSheetCreatorState {
  pageWidthInches: number;
  pageHeightInches: number;
  rows: number;
  columns: number;
  marginXInches: number;
  marginYInches: number;
  paddingXInches: number;
  paddingYInches: number;
  printDashedBorders: boolean;
}

export interface ResolvedCell {
  id: string;
  text: string;
  width: number;
  textAlign: TagTextAlign;
  fontSize: number;
  overflow?: boolean;
  fit?: boolean;
  wrap?: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface ResolvedRow {
  id: string;
  cells: ResolvedCell[];
  isSpacer?: boolean;
}

export interface TagPreviewData {
  id: string;
  rows: ResolvedRow[];
  qrCodeUrl?: string | null;
}

export interface StoredTagLayoutTemplate {
  id: string;
  name: string;
  layout: TagDesignerState;
}

export interface ResolvedTagLayoutTemplate extends StoredTagLayoutTemplate {
  isBuiltin: boolean;
  signature: string;
}

export interface ResolvedSheetMetrics {
  tagsPerSheet: number;
  slotWidthInches: number;
  slotHeightInches: number;
  requiredWidthInches: number;
  requiredHeightInches: number;
  isValid: boolean;
}

export type UpdateTagDesignerState = (
  updater: (previous: TagDesignerState) => TagDesignerState,
) => void;

export type UpdateTagSheetCreatorState = (
  updater: (previous: TagSheetCreatorState) => TagSheetCreatorState,
) => void;

export const TAG_DESIGNER_STORAGE_KEY = "tag-designer-state-v2";
export const TAG_TEMPLATE_LIBRARY_STORAGE_KEY = "tag-designer-templates-v1";
export const TAG_SHEET_CREATOR_STORAGE_KEY = "tag-sheet-creator-state-v1";
const TEMPLATE_DEFAULT_ID = "default-template";
export const TEMPLATE_CUSTOM_ID = "custom-template";
const TEMPLATE_SIMPLE_NAME_ID = "template-simple-name";
const TEMPLATE_SALE_TAG_ID = "template-sale-tag";
const TEMPLATE_GROWER_DETAILS_ID = "template-grower-details";
const LARGE_LINE_FONT_SIZE_PX = 22;
const MEDIUM_LINE_FONT_SIZE_PX = 16;
const NORMAL_LINE_FONT_SIZE_PX = 14;
const SMALL_LINE_FONT_SIZE_PX = 11;

export const MIN_TAG_WIDTH_INCHES = 1;
export const MAX_TAG_WIDTH_INCHES = 6;
export const MIN_TAG_HEIGHT_INCHES = 0.5;
export const MAX_TAG_HEIGHT_INCHES = 4;
export const CSS_PIXELS_PER_INCH = 96;
const TAG_HORIZONTAL_PADDING_INCHES = 0.16;
const TAG_COLUMN_GAP_INCHES = 0.06;
const MIN_FIT_FONT_SIZE_PX = 6;
const AVERAGE_CHARACTER_WIDTH_EM = 0.56;
const FIT_FONT_SCALE_BUFFER = 0.95;
export const QR_SIZE_INCHES = 0.5;
const QR_OFFSET_INCHES = 0.06;
const QR_TEXT_GAP_INCHES = 0.04;
const QR_RESERVED_RIGHT_INCHES =
  QR_SIZE_INCHES + QR_OFFSET_INCHES + QR_TEXT_GAP_INCHES;
export const TAG_SPACER_HEIGHT_INCHES = 0.08;
const MIN_SHEET_PAGE_WIDTH_INCHES = MIN_TAG_WIDTH_INCHES;
export const MAX_SHEET_PAGE_WIDTH_INCHES = 24;
const MIN_SHEET_PAGE_HEIGHT_INCHES = MIN_TAG_HEIGHT_INCHES;
export const MAX_SHEET_PAGE_HEIGHT_INCHES = 24;
export const MIN_SHEET_ROWS = 1;
export const MAX_SHEET_ROWS = 20;
export const MIN_SHEET_COLUMNS = 1;
export const MAX_SHEET_COLUMNS = 20;
export const MIN_SHEET_MARGIN_INCHES = 0;
export const MAX_SHEET_MARGIN_INCHES = 6;
export const MIN_SHEET_PADDING_INCHES = 0;
export const MAX_SHEET_PADDING_INCHES = 6;
export const MIN_SHEET_COPIES_PER_LABEL = 1;
export const MAX_SHEET_COPIES_PER_LABEL = 500;

export const TAG_SIZE_PRESETS: TagSizePreset[] = [
  {
    id: "brother-tze-1",
    label: 'Brother TZe 1.00" × 3.50"',
    widthInches: 3.5,
    heightInches: 1,
  },
  {
    id: "compact-0.75",
    label: 'Compact 0.75" × 3.00"',
    widthInches: 3,
    heightInches: 0.75,
  },
  {
    id: "roomy-1.25",
    label: 'Roomy 1.25" × 3.50"',
    widthInches: 3.5,
    heightInches: 1.25,
  },
  {
    id: "card-2x3.5",
    label: 'Card 2.00" × 3.50"',
    widthInches: 3.5,
    heightInches: 2,
  },
  {
    id: "card-2x4",
    label: 'Card 2.00" × 4.00"',
    widthInches: 4,
    heightInches: 2,
  },
  {
    id: "custom",
    label: "Custom",
    widthInches: 3.5,
    heightInches: 1,
  },
];

const FIELD_DISPLAY_NAMES: Record<TagFieldId, string> = {
  title: "Title",
  hybridizerYear: "Hybridizer, Year",
  hybridizer: "Hybridizer",
  year: "Year",
  price: "Price",
  ploidy: "Ploidy",
  bloomSize: "Bloom Size",
  scapeHeight: "Scape Height",
  bloomSeason: "Bloom Season",
  bloomHabit: "Bloom Habit",
  color: "Color",
  form: "Form",
  foliageType: "Foliage Type",
  fragrance: "Fragrance",
  budcount: "Bud Count",
  branches: "Branches",
  parentage: "Parentage",
  sculpting: "Sculpting",
  foliage: "Foliage",
  flower: "Flower",
  privateNote: "Private Note",
  listName: "List Name",
  customText: "Free text",
};

const FIELD_DEFAULTS: Record<
  TagFieldId,
  Pick<TagCell, "label" | "bold" | "fontSize">
> = {
  title: { label: "", bold: true, fontSize: 22 },
  hybridizerYear: { label: "", bold: false, fontSize: 16 },
  hybridizer: { label: "Hybridizer", bold: false, fontSize: 16 },
  year: { label: "", bold: false, fontSize: 16 },
  price: { label: "", bold: true, fontSize: 16 },
  ploidy: { label: "", bold: false, fontSize: 16 },
  bloomSize: { label: "Bloom Size", bold: false, fontSize: 16 },
  scapeHeight: { label: "Scape Height", bold: false, fontSize: 16 },
  bloomSeason: { label: "Bloom Season", bold: false, fontSize: 16 },
  bloomHabit: { label: "Bloom Habit", bold: false, fontSize: 16 },
  color: { label: "", bold: false, fontSize: 16 },
  form: { label: "", bold: false, fontSize: 16 },
  foliageType: { label: "Foliage Type", bold: false, fontSize: 16 },
  fragrance: { label: "Fragrance", bold: false, fontSize: 16 },
  budcount: { label: "Bud Count", bold: false, fontSize: 16 },
  branches: { label: "Branches", bold: false, fontSize: 16 },
  parentage: { label: "Parentage", bold: false, fontSize: 16 },
  sculpting: { label: "Sculpting", bold: false, fontSize: 16 },
  foliage: { label: "Foliage", bold: false, fontSize: 16 },
  flower: { label: "Flower", bold: false, fontSize: 16 },
  privateNote: { label: "Note", bold: false, fontSize: 16 },
  listName: { label: "List", bold: false, fontSize: 16 },
  customText: { label: "", bold: false, fontSize: 16 },
};

let _nextRowId = 0;

function generateRowId() {
  return `r-${Date.now()}-${_nextRowId++}`;
}

function createTemplateCell(
  fieldId: TagFieldId,
  overrides: Partial<TagCell> = {},
): TagCell {
  const defaults = FIELD_DEFAULTS[fieldId];
  return {
    fieldId,
    width: 1,
    textAlign: fieldId === "title" ? "center" : "left",
    fontSize: defaults.fontSize,
    overflow: false,
    fit: true,
    wrap: false,
    bold: defaults.bold,
    italic: false,
    underline: false,
    label: "",
    ...overrides,
  };
}

const SIMPLE_NAME_TEMPLATE = "# {{title}}";
const GARDEN_ID_TEMPLATE = "# {{title}}\n{{hybridizerYear}}\n- {{ploidy}}";
const SALE_TAG_TEMPLATE =
  "# {{title}}\n{{hybridizerYear}}\n## {{ploidy}} | {{price}}";
const GROWER_DETAILS_TEMPLATE =
  "# {{title}}\n## {{hybridizerYear}}\n{{ploidy}} | {{foliageType}}\nBloom {{bloomSize}} | Scape {{scapeHeight}}\n- Season {{bloomSeason}} | Habit {{bloomHabit}}";

const LEGACY_DEFAULT_ROWS: TagRow[] = [
  {
    id: "legacy-default-title",
    cells: [createTemplateCell("title")],
  },
  {
    id: "legacy-default-details",
    cells: [
      createTemplateCell("hybridizer", { textAlign: "center" }),
      createTemplateCell("year"),
      createTemplateCell("ploidy", { textAlign: "center" }),
    ],
  },
];
const LEGACY_DEFAULT_ROWS_SIGNATURE =
  createRowsLayoutSignature(LEGACY_DEFAULT_ROWS);

function createBuiltinTemplateRows(idPrefix: string, template: string) {
  return createRowsFromTagTextTemplate(template).map((row, index) => ({
    ...row,
    id: `${idPrefix}-${index}`,
  }));
}

export const DEFAULT_TAG_DESIGNER_STATE: TagDesignerState = {
  sizePresetId: "brother-tze-1",
  customWidthInches: 3.5,
  customHeightInches: 1,
  showQrCode: true,
  rows: createBuiltinTemplateRows("garden-id-row", GARDEN_ID_TEMPLATE),
};

export const PLACEHOLDER_LISTING: TagListingData = DEFAULT_LISTING;

export const BUILTIN_TAG_LAYOUT_TEMPLATES: Array<
  Omit<ResolvedTagLayoutTemplate, "isBuiltin" | "signature">
> = [
  {
    id: TEMPLATE_SIMPLE_NAME_ID,
    name: "Simple name",
    layout: {
      sizePresetId: "brother-tze-1",
      customWidthInches: 3.5,
      customHeightInches: 1,
      showQrCode: true,
      rows: createBuiltinTemplateRows("simple-name-row", SIMPLE_NAME_TEMPLATE),
    },
  },
  {
    id: TEMPLATE_DEFAULT_ID,
    name: "Garden ID",
    layout: DEFAULT_TAG_DESIGNER_STATE,
  },
  {
    id: TEMPLATE_SALE_TAG_ID,
    name: "Sale tag",
    layout: {
      sizePresetId: "brother-tze-1",
      customWidthInches: 3.5,
      customHeightInches: 1,
      showQrCode: true,
      rows: createBuiltinTemplateRows("sale-tag-row", SALE_TAG_TEMPLATE),
    },
  },
  {
    id: TEMPLATE_GROWER_DETAILS_ID,
    name: "Grower details",
    layout: {
      sizePresetId: "card-2x4",
      customWidthInches: 4,
      customHeightInches: 2,
      showQrCode: true,
      rows: createBuiltinTemplateRows(
        "grower-details-row",
        GROWER_DETAILS_TEMPLATE,
      ),
    },
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeInches(value: number) {
  return Number(value.toFixed(2));
}

function toFiniteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatSheetNumberForInput(value: number, decimals: number) {
  if (decimals === 0) return String(Math.round(value));
  return value.toFixed(decimals);
}

export function parseSheetNumberInput(input: string, decimals: number) {
  const parsed =
    decimals === 0 ? Number.parseInt(input, 10) : Number.parseFloat(input);
  if (!Number.isFinite(parsed)) return null;
  if (decimals === 0 && !Number.isInteger(parsed)) return null;
  return parsed;
}

export function normalizeSheetNumber(
  value: number,
  min: number,
  max: number,
  decimals: number,
) {
  const clamped = clamp(value, min, max);
  if (decimals === 0) {
    return Math.round(clamped);
  }
  return Number(clamped.toFixed(decimals));
}

function toNonEmptyString(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length === 0) return null;
  return trimmed;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function buildPublicListingUrl(
  baseUrl: string,
  userId: string,
  listingId: string,
) {
  return `${trimTrailingSlash(baseUrl)}/${encodeURIComponent(
    userId,
  )}?viewing=${encodeURIComponent(listingId)}`;
}

export function buildQrCodeSvgMarkup(url: string) {
  const qrCode = qrcodeGenerator(0, "M");
  qrCode.addData(url);
  qrCode.make();
  return qrCode.createSvgTag({
    cellSize: 1,
    margin: 4,
    scalable: true,
  });
}

function normalizePloidy(value: string | null | undefined) {
  const normalized = toNonEmptyString(value);
  if (!normalized) return null;
  if (normalized.toLowerCase() === "tetraploid") return "tet";
  if (normalized.toLowerCase() === "diploid") return "dip";
  return normalized;
}

function resolveFieldValue(
  listing: TagListingData,
  fieldId: TagFieldId,
): string | null {
  switch (fieldId) {
    case "title":
      return toNonEmptyString(listing.title);
    case "hybridizerYear": {
      const hybridizer = toNonEmptyString(listing.ahsListing?.hybridizer);
      const year = listing.ahsListing?.year
        ? String(listing.ahsListing.year)
        : null;
      return [hybridizer, year].filter(Boolean).join(", ") || null;
    }
    case "hybridizer":
      return toNonEmptyString(listing.ahsListing?.hybridizer);
    case "year":
      return listing.ahsListing?.year ? String(listing.ahsListing.year) : null;
    case "price":
      return typeof listing.price === "number"
        ? `$${listing.price.toFixed(2)}`
        : null;
    case "ploidy":
      return normalizePloidy(listing.ahsListing?.ploidy);
    case "bloomSize":
      return toNonEmptyString(listing.ahsListing?.bloomSize);
    case "scapeHeight":
      return toNonEmptyString(listing.ahsListing?.scapeHeight);
    case "bloomSeason":
      return toNonEmptyString(listing.ahsListing?.bloomSeason);
    case "bloomHabit":
      return toNonEmptyString(listing.ahsListing?.bloomHabit);
    case "color":
      return toNonEmptyString(listing.ahsListing?.color);
    case "form":
      return toNonEmptyString(listing.ahsListing?.form);
    case "foliageType":
      return toNonEmptyString(listing.ahsListing?.foliageType);
    case "fragrance":
      return toNonEmptyString(listing.ahsListing?.fragrance);
    case "budcount":
      return toNonEmptyString(listing.ahsListing?.budcount);
    case "branches":
      return toNonEmptyString(listing.ahsListing?.branches);
    case "parentage":
      return toNonEmptyString(listing.ahsListing?.parentage);
    case "sculpting":
      return toNonEmptyString(listing.ahsListing?.sculpting);
    case "foliage":
      return toNonEmptyString(listing.ahsListing?.foliage);
    case "flower":
      return toNonEmptyString(listing.ahsListing?.flower);
    case "privateNote":
      return toNonEmptyString(listing.privateNote);
    case "listName":
      return toNonEmptyString(listing.listName);
    default:
      return null;
  }
}

export const TAG_TEMPLATE_FIELD_DEFINITIONS: Array<{
  id: Exclude<TagFieldId, "customText">;
  label: string;
}> = ALL_FIELD_IDS.filter(
  (fieldId): fieldId is Exclude<TagFieldId, "customText"> =>
    fieldId !== "customText",
).map((fieldId) => ({
  id: fieldId,
  label: FIELD_DISPLAY_NAMES[fieldId],
}));

const TAG_TEMPLATE_TOKEN_PATTERN = /{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g;

function cleanRenderedTemplateText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,;:])/g, "$1")
    .replace(/([,;:|·])(?:\s*[,;:|·])+/g, "$1")
    .replace(/^[\s,;:|·–—-]+|[\s,;:|·–—-]+$/g, "")
    .trim();
}

export function renderTagTextTemplate(
  template: string,
  listing: TagListingData,
) {
  return cleanRenderedTemplateText(
    template.replace(TAG_TEMPLATE_TOKEN_PATTERN, (_, fieldName: string) => {
      if (!VALID_FIELD_IDS.has(fieldName) || fieldName === "customText") {
        return "";
      }
      return resolveFieldValue(listing, fieldName as TagFieldId) ?? "";
    }),
  );
}

export function findUnknownTagTemplateFields(template: string) {
  const unknownFields = new Set<string>();
  for (const match of template.matchAll(TAG_TEMPLATE_TOKEN_PATTERN)) {
    const fieldName = match[1]!;
    if (!VALID_FIELD_IDS.has(fieldName) || fieldName === "customText") {
      unknownFields.add(fieldName);
    }
  }
  return [...unknownFields];
}

export function getTagTextTemplateFieldIds(template: string) {
  const fieldIds = new Set<Exclude<TagFieldId, "customText">>();
  for (const match of template.matchAll(TAG_TEMPLATE_TOKEN_PATTERN)) {
    const fieldName = match[1]!;
    if (VALID_FIELD_IDS.has(fieldName) && fieldName !== "customText") {
      fieldIds.add(fieldName as Exclude<TagFieldId, "customText">);
    }
  }
  return [...fieldIds];
}

function templateTextForCell(cell: TagCell) {
  if (cell.fieldId === "customText") return cell.label;
  const token = `{{${cell.fieldId}}}`;
  return cell.label ? `${cell.label}: ${token}` : token;
}

function templateLinePrefix(row: TagRow) {
  const firstCell = row.cells[0];
  if (!firstCell) return "";
  if (firstCell.bold && firstCell.fontSize >= LARGE_LINE_FONT_SIZE_PX) {
    return "# ";
  }
  if (firstCell.bold && firstCell.fontSize >= MEDIUM_LINE_FONT_SIZE_PX) {
    return "## ";
  }
  if (firstCell.fontSize <= SMALL_LINE_FONT_SIZE_PX) return "- ";
  return "";
}

export function tagDesignerStateToTemplateText(state: TagDesignerState) {
  return state.rows
    .map((row) => {
      if (row.isSpacer) return "";
      const prefix = templateLinePrefix(row);
      const fieldIds = row.cells.map((cell) => cell.fieldId);
      if (
        fieldIds.length >= 2 &&
        fieldIds[0] === "hybridizer" &&
        fieldIds[1] === "year"
      ) {
        const remainingCells = row.cells.slice(2).map(templateTextForCell);
        return `${prefix}${["{{hybridizerYear}}", ...remainingCells].join(
          " | ",
        )}`;
      }
      return `${prefix}${row.cells.map(templateTextForCell).join(" | ")}`;
    })
    .join("\n");
}

function parseTemplateLine(line: string) {
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith("## ")) {
    return {
      text: trimmedLine.slice(3),
      fontSize: MEDIUM_LINE_FONT_SIZE_PX,
      bold: true,
    };
  }
  if (trimmedLine.startsWith("# ")) {
    return {
      text: trimmedLine.slice(2),
      fontSize: LARGE_LINE_FONT_SIZE_PX,
      bold: true,
    };
  }
  if (trimmedLine.startsWith("- ")) {
    return {
      text: trimmedLine.slice(2),
      fontSize: SMALL_LINE_FONT_SIZE_PX,
      bold: false,
    };
  }
  return {
    text: trimmedLine,
    fontSize: NORMAL_LINE_FONT_SIZE_PX,
    bold: false,
  };
}

export function createRowsFromTagTextTemplate(template: string): TagRow[] {
  const lines = template.split(/\r?\n/);
  while (lines.length > 0 && lines[0]?.trim().length === 0) lines.shift();
  while (lines.length > 0 && lines.at(-1)?.trim().length === 0) lines.pop();
  const normalizedLines = lines.length > 0 ? lines : [""];

  return normalizedLines.map((line) => {
    if (line.trim().length === 0 && normalizedLines.length > 1) {
      return {
        id: generateRowId(),
        cells: [],
        isSpacer: true,
      };
    }

    const parsed = parseTemplateLine(line);
    const columns = parsed.text
      .split("|")
      .map((column) => column.trim())
      .filter(Boolean);
    const normalizedColumns = columns.length > 0 ? columns : [""];

    return {
      id: generateRowId(),
      cells: normalizedColumns.map((column, index) =>
        createTemplateCell("customText", {
          label: column,
          textAlign:
            normalizedColumns.length === 1
              ? "center"
              : index === 0
                ? "left"
                : index === normalizedColumns.length - 1
                  ? "right"
                  : "center",
          fontSize: parsed.fontSize,
          bold: parsed.bold,
          fit: true,
          wrap: false,
        }),
      ),
    };
  });
}

export function applyTagTextTemplate(
  state: TagDesignerState,
  template: string,
): TagDesignerState {
  return {
    ...state,
    rows: createRowsFromTagTextTemplate(template),
  };
}

export function getRecommendedTagTemplateRowCount(heightInches: number) {
  if (heightInches <= 0.75) return 2;
  if (heightInches <= 1) return 3;
  if (heightInches <= 1.25) return 4;
  return 6;
}

export function getTagTemplateValidationIssues(template: string) {
  const issues: string[] = [];

  if (template.includes("```")) {
    issues.push("Paste plain template text without a Markdown code fence.");
  }
  if (
    template
      .split(/\r?\n/)
      .some(
        (line) => line.split("|").filter((column) => column.trim()).length > 2,
      )
  ) {
    issues.push("Use no more than two columns per row.");
  }
  if (/<\/?[a-z][^>]*>/i.test(template)) {
    issues.push("HTML is not supported.");
  }

  const openingBraceCount = template.match(/{{/g)?.length ?? 0;
  const closingBraceCount = template.match(/}}/g)?.length ?? 0;
  if (
    openingBraceCount !== closingBraceCount ||
    template.replace(TAG_TEMPLATE_TOKEN_PATTERN, "").includes("{{") ||
    template.replace(TAG_TEMPLATE_TOKEN_PATTERN, "").includes("}}")
  ) {
    issues.push("One or more field placeholders have incomplete braces.");
  }

  return issues;
}

export function buildTagTemplateAiInstructions(
  currentTemplate: string,
  {
    widthInches = 3.5,
    heightInches = 1,
    showQrCode = true,
  }: {
    widthInches?: number;
    heightInches?: number;
    showQrCode?: boolean;
  } = {},
) {
  const fields = TAG_TEMPLATE_FIELD_DEFINITIONS.map(
    (field) => `- {{${field.id}}}: ${field.label}`,
  ).join("\n");
  const recommendedRows = getRecommendedTagTemplateRowCount(heightInches);

  return `Help me write a Daylily Catalog plant-tag template.

Return only the finished template text. Each line becomes one printed line.
Tag size: ${widthInches.toFixed(2)}" × ${heightInches.toFixed(2)}".
QR code: ${showQrCode ? "on; it always occupies the right side" : "off"}.
Use no more than ${recommendedRows} nonblank rows and no more than two columns per row.
Text never wraps and shrinks to fit its line. Start a line with:
- # for large bold
- ## for medium bold
- - for small detail text
Use | to space columns apart. Insert listing data with {{fieldName}}
placeholders. A blank line adds vertical space between rows. For example:
# {{title}}
## {{hybridizerYear}} | {{ploidy}}
- Bloom {{bloomSize}} | Scape {{scapeHeight}}

Use {{hybridizerYear}} for the common "Hybridizer, Year" format. Missing values
and empty labeled columns are omitted. Return plain template text only, with no
explanation and no code fence. Do not use HTML or other Markdown.

Available fields:
${fields}

Current template:
${currentTemplate}`;
}

const VALID_TEXT_ALIGNS = new Set<TagTextAlign>(["left", "center", "right"]);
const VALID_FIELD_IDS = new Set<string>(ALL_FIELD_IDS);

function sanitizeCell(cell: Partial<TagCell>): TagCell | null {
  if (!cell || typeof cell !== "object") return null;
  if (!cell.fieldId || !VALID_FIELD_IDS.has(cell.fieldId)) return null;

  const fieldId = cell.fieldId;
  const defaults = FIELD_DEFAULTS[fieldId];

  return {
    fieldId,
    width: clamp(Math.round(Number(cell.width) || 1), 1, 12),
    textAlign: VALID_TEXT_ALIGNS.has(cell.textAlign!)
      ? cell.textAlign!
      : "left",
    fontSize: clamp(Number(cell.fontSize) || defaults.fontSize, 6, 28),
    overflow: false,
    fit: true,
    wrap: false,
    bold: typeof cell.bold === "boolean" ? cell.bold : defaults.bold,
    italic: Boolean(cell.italic),
    underline: Boolean(cell.underline),
    label: typeof cell.label === "string" ? cell.label : defaults.label,
  };
}

function sanitizeRow(row: Partial<TagRow>): TagRow | null {
  if (!row || typeof row !== "object" || !Array.isArray(row.cells)) return null;

  if (row.isSpacer) {
    return {
      id: typeof row.id === "string" && row.id ? row.id : generateRowId(),
      cells: [],
      isSpacer: true,
    };
  }

  const cells = (row.cells as Partial<TagCell>[])
    .map((c) => sanitizeCell(c))
    .filter((c): c is TagCell => c !== null);

  if (cells.length === 0) return null;

  return {
    id: typeof row.id === "string" && row.id ? row.id : generateRowId(),
    cells,
  };
}

export function sanitizeTagDesignerState(
  state: TagDesignerState,
): TagDesignerState {
  if (!Array.isArray((state as unknown as Record<string, unknown>).rows)) {
    return { ...DEFAULT_TAG_DESIGNER_STATE };
  }

  const presetExists = TAG_SIZE_PRESETS.some(
    (p) => p.id === state.sizePresetId,
  );

  const rows = (state.rows as Partial<TagRow>[])
    .map((r) => sanitizeRow(r))
    .filter((r): r is TagRow => r !== null);
  const migratedRows =
    createRowsLayoutSignature(rows) === LEGACY_DEFAULT_ROWS_SIGNATURE
      ? DEFAULT_TAG_DESIGNER_STATE.rows
      : rows;

  return {
    sizePresetId: presetExists
      ? state.sizePresetId
      : DEFAULT_TAG_DESIGNER_STATE.sizePresetId,
    customWidthInches: clamp(
      Number(state.customWidthInches) ||
        DEFAULT_TAG_DESIGNER_STATE.customWidthInches,
      MIN_TAG_WIDTH_INCHES,
      MAX_TAG_WIDTH_INCHES,
    ),
    customHeightInches: clamp(
      Number(state.customHeightInches) ||
        DEFAULT_TAG_DESIGNER_STATE.customHeightInches,
      MIN_TAG_HEIGHT_INCHES,
      MAX_TAG_HEIGHT_INCHES,
    ),
    showQrCode:
      typeof state.showQrCode === "boolean"
        ? state.showQrCode
        : DEFAULT_TAG_DESIGNER_STATE.showQrCode,
    rows:
      migratedRows.length > 0 ? migratedRows : DEFAULT_TAG_DESIGNER_STATE.rows,
  };
}

export function createDefaultSheetCreatorState({
  tagWidthInches,
  tagHeightInches,
}: {
  tagWidthInches: number;
  tagHeightInches: number;
}): TagSheetCreatorState {
  return {
    pageWidthInches: normalizeInches(tagWidthInches),
    pageHeightInches: normalizeInches(tagHeightInches),
    rows: 1,
    columns: 1,
    marginXInches: 0,
    marginYInches: 0,
    paddingXInches: 0,
    paddingYInches: 0,
    printDashedBorders: false,
  };
}

export function sanitizeTagSheetCreatorState(
  state: TagSheetCreatorState | null | undefined,
  {
    tagWidthInches,
    tagHeightInches,
  }: {
    tagWidthInches: number;
    tagHeightInches: number;
  },
): TagSheetCreatorState {
  const fallback = createDefaultSheetCreatorState({
    tagWidthInches,
    tagHeightInches,
  });
  if (!state || typeof state !== "object") return fallback;

  const pageWidthInches = toFiniteNumber(state.pageWidthInches);
  const pageHeightInches = toFiniteNumber(state.pageHeightInches);
  const rows = toFiniteNumber(state.rows);
  const columns = toFiniteNumber(state.columns);
  const marginXInches = toFiniteNumber(state.marginXInches);
  const marginYInches = toFiniteNumber(state.marginYInches);
  const paddingXInches = toFiniteNumber(state.paddingXInches);
  const paddingYInches = toFiniteNumber(state.paddingYInches);

  return {
    pageWidthInches: normalizeInches(
      clamp(
        pageWidthInches ?? fallback.pageWidthInches,
        MIN_SHEET_PAGE_WIDTH_INCHES,
        MAX_SHEET_PAGE_WIDTH_INCHES,
      ),
    ),
    pageHeightInches: normalizeInches(
      clamp(
        pageHeightInches ?? fallback.pageHeightInches,
        MIN_SHEET_PAGE_HEIGHT_INCHES,
        MAX_SHEET_PAGE_HEIGHT_INCHES,
      ),
    ),
    rows: clamp(
      Math.round(rows ?? fallback.rows),
      MIN_SHEET_ROWS,
      MAX_SHEET_ROWS,
    ),
    columns: clamp(
      Math.round(columns ?? fallback.columns),
      MIN_SHEET_COLUMNS,
      MAX_SHEET_COLUMNS,
    ),
    marginXInches: normalizeInches(
      clamp(
        marginXInches ?? fallback.marginXInches,
        MIN_SHEET_MARGIN_INCHES,
        MAX_SHEET_MARGIN_INCHES,
      ),
    ),
    marginYInches: normalizeInches(
      clamp(
        marginYInches ?? fallback.marginYInches,
        MIN_SHEET_MARGIN_INCHES,
        MAX_SHEET_MARGIN_INCHES,
      ),
    ),
    paddingXInches: normalizeInches(
      clamp(
        paddingXInches ?? fallback.paddingXInches,
        MIN_SHEET_PADDING_INCHES,
        MAX_SHEET_PADDING_INCHES,
      ),
    ),
    paddingYInches: normalizeInches(
      clamp(
        paddingYInches ?? fallback.paddingYInches,
        MIN_SHEET_PADDING_INCHES,
        MAX_SHEET_PADDING_INCHES,
      ),
    ),
    printDashedBorders:
      typeof state.printDashedBorders === "boolean"
        ? state.printDashedBorders
        : fallback.printDashedBorders,
  };
}

export function resolveSheetMetrics(
  sheetState: TagSheetCreatorState,
  {
    tagWidthInches,
    tagHeightInches,
  }: {
    tagWidthInches: number;
    tagHeightInches: number;
  },
): ResolvedSheetMetrics {
  const tagsPerSheet = sheetState.rows * sheetState.columns;
  const slotWidthInches = tagWidthInches;
  const slotHeightInches = tagHeightInches;
  const requiredWidthInches =
    sheetState.marginXInches * 2 +
    slotWidthInches * sheetState.columns +
    sheetState.paddingXInches * Math.max(sheetState.columns - 1, 0);
  const requiredHeightInches =
    sheetState.marginYInches * 2 +
    slotHeightInches * sheetState.rows +
    sheetState.paddingYInches * Math.max(sheetState.rows - 1, 0);

  return {
    tagsPerSheet,
    slotWidthInches,
    slotHeightInches,
    requiredWidthInches,
    requiredHeightInches,
    isValid:
      tagsPerSheet > 0 &&
      Number.isFinite(slotWidthInches) &&
      Number.isFinite(slotHeightInches) &&
      slotWidthInches > 0 &&
      slotHeightInches > 0 &&
      sheetState.pageWidthInches >= requiredWidthInches &&
      sheetState.pageHeightInches >= requiredHeightInches,
  };
}

function createRowsLayoutSignature(rows: TagRow[]) {
  return JSON.stringify(
    rows.map((row) => ({
      isSpacer: Boolean(row.isSpacer),
      cells: row.cells.map((cell) => ({
        fieldId: cell.fieldId,
        width: cell.width,
        textAlign: cell.textAlign,
        fontSize: Number(cell.fontSize.toFixed(2)),
        overflow: cell.overflow,
        fit: cell.fit,
        wrap: cell.wrap,
        bold: cell.bold,
        italic: cell.italic,
        underline: cell.underline,
        label: cell.label,
      })),
    })),
  );
}

export function createLayoutSignature(layout: TagDesignerState) {
  return createRowsLayoutSignature(sanitizeTagDesignerState(layout).rows);
}

export function sanitizeStoredTemplate(
  candidate: unknown,
): StoredTagLayoutTemplate | null {
  if (!candidate || typeof candidate !== "object") return null;

  const record = candidate as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string") {
    return null;
  }

  if (!record.layout || typeof record.layout !== "object") {
    return null;
  }

  const name = record.name.trim();
  if (name.length === 0) return null;

  return {
    id: record.id,
    name: name.slice(0, 120),
    layout: sanitizeTagDesignerState(record.layout as TagDesignerState),
  };
}

export function buildResolvedRowsForListing(
  listing: TagListingData,
  rows: TagRow[],
): ResolvedRow[] {
  const result: ResolvedRow[] = [];

  for (const row of rows) {
    if (row.isSpacer) {
      result.push({
        id: `${listing.id}-${row.id}`,
        cells: [],
        isSpacer: true,
      });
      continue;
    }

    const resolved: ResolvedCell[] = [];

    for (const [cellIndex, cell] of row.cells.entries()) {
      let text: string;
      if (cell.fieldId === "customText") {
        const referencedFields = getTagTextTemplateFieldIds(cell.label ?? "");
        if (
          referencedFields.length > 0 &&
          referencedFields.every(
            (fieldId) => resolveFieldValue(listing, fieldId) === null,
          )
        ) {
          continue;
        }
        text = renderTagTextTemplate(cell.label ?? "", listing);
      } else {
        const value = resolveFieldValue(listing, cell.fieldId);
        text = value ? (cell.label ? `${cell.label}: ${value}` : value) : "";
      }

      if (!text) continue;

      resolved.push({
        id: `${listing.id}-${row.id}-${cellIndex}-${cell.fieldId}`,
        text,
        width: cell.width,
        textAlign: cell.textAlign,
        fontSize: cell.fontSize,
        overflow: cell.overflow,
        fit: cell.fit,
        wrap: false,
        bold: cell.bold,
        italic: cell.italic,
        underline: cell.underline,
      });
    }

    if (resolved.length > 0) {
      result.push({ id: `${listing.id}-${row.id}`, cells: resolved });
    }
  }

  while (result[0]?.isSpacer) result.shift();
  while (result.at(-1)?.isSpacer) result.pop();
  return result;
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function downloadSelectedListingsCsv(
  listings: TagListingData[],
  rows: TagRow[],
) {
  const usedFieldIds = new Set<TagFieldId>();
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.fieldId === "customText") {
        for (const fieldId of getTagTextTemplateFieldIds(cell.label)) {
          usedFieldIds.add(fieldId);
        }
      } else {
        usedFieldIds.add(cell.fieldId);
      }
    }
  }

  const includedFields = ALL_FIELD_IDS.filter(
    (id) => usedFieldIds.has(id) && id !== "customText",
  );
  if (!includedFields.length || !listings.length) return;

  const header = includedFields.map((id) =>
    escapeCsvCell(FIELD_DISPLAY_NAMES[id]),
  );
  const csvRows = listings.map((listing) =>
    includedFields.map((id) => {
      const raw = resolveFieldValue(listing, id);
      return raw ? escapeCsvCell(raw) : "";
    }),
  );

  const csv = [header, ...csvRows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tag-listings.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function resolveCellFontSizePx(
  cell: ResolvedCell,
  row: ResolvedRow,
  tagWidthInches: number,
  hasQrCode: boolean,
) {
  const shouldFit = cell.fit ?? true;
  if (cell.wrap) return cell.fontSize;
  if (!shouldFit) return cell.fontSize;

  const innerWidthInches =
    tagWidthInches -
    TAG_HORIZONTAL_PADDING_INCHES -
    (hasQrCode ? QR_RESERVED_RIGHT_INCHES : 0) -
    TAG_COLUMN_GAP_INCHES * Math.max(row.cells.length - 1, 0);
  if (innerWidthInches <= 0) return cell.fontSize;

  const rowTotalWidthUnits = row.cells.reduce(
    (total, rowCell) => total + rowCell.width,
    0,
  );
  if (rowTotalWidthUnits <= 0) return cell.fontSize;

  const cellWidthInches = innerWidthInches * (cell.width / rowTotalWidthUnits);
  const cellWidthPx = Math.max(cellWidthInches * CSS_PIXELS_PER_INCH, 1);
  const estimatedTextWidthPx =
    Math.max(cell.text.length, 1) * cell.fontSize * AVERAGE_CHARACTER_WIDTH_EM;

  if (estimatedTextWidthPx <= cellWidthPx) return cell.fontSize;

  return Number(
    clamp(
      (cellWidthPx / estimatedTextWidthPx) *
        cell.fontSize *
        FIT_FONT_SCALE_BUFFER,
      MIN_FIT_FONT_SIZE_PX,
      cell.fontSize,
    ).toFixed(2),
  );
}

export function getTagPreviewWarnings({
  tags,
  widthInches,
  heightInches,
}: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
}) {
  let hasSmallText = false;
  let hasVerticalOverflow = false;
  const availableHeightPx = Math.max(
    (heightInches - 0.12) * CSS_PIXELS_PER_INCH,
    1,
  );

  for (const tag of tags) {
    const hasQrCode = Boolean(tag.qrCodeUrl);
    let estimatedHeightPx = 0;

    for (const row of tag.rows) {
      if (row.isSpacer) {
        estimatedHeightPx += TAG_SPACER_HEIGHT_INCHES * CSS_PIXELS_PER_INCH;
        continue;
      }

      const fittedSizes = row.cells.map((cell) =>
        resolveCellFontSizePx(cell, row, widthInches, hasQrCode),
      );
      if (fittedSizes.some((fontSize) => fontSize < 10)) {
        hasSmallText = true;
      }
      estimatedHeightPx += Math.max(...fittedSizes, 0) * 1.2;
    }

    if (estimatedHeightPx > availableHeightPx) {
      hasVerticalOverflow = true;
    }
  }

  const warnings: string[] = [];
  if (hasSmallText) {
    warnings.push(
      "Some text shrinks below 10px. Use a wider tag or fewer fields.",
    );
  }
  if (hasVerticalOverflow) {
    warnings.push("This layout may be too tall for the selected tag size.");
  }
  return warnings;
}

export function duplicateTagsForSheetLabels(
  tags: TagPreviewData[],
  copiesPerLabel: number,
) {
  if (!tags.length) return [];
  const normalizedCopies = Math.max(
    MIN_SHEET_COPIES_PER_LABEL,
    Math.floor(copiesPerLabel),
  );
  if (normalizedCopies <= 1) return tags;

  const duplicatedTags: TagPreviewData[] = [];
  for (const tag of tags) {
    for (let copyIndex = 0; copyIndex < normalizedCopies; copyIndex += 1) {
      duplicatedTags.push({
        ...tag,
        id: `${tag.id}--copy-${copyIndex + 1}`,
      });
    }
  }

  return duplicatedTags;
}

export function chunkTags<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}
