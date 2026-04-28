"use client";

import qrcodeGenerator from "qrcode-generator";

export const ALL_FIELD_IDS = [
  "title",
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
export type TagTextAlign = "left" | "center" | "right";

export interface TagAhsListingData {
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

export interface TagSizePreset {
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

export interface ResolvedRow {
  id: string;
  cells: ResolvedCell[];
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
export const TEMPLATE_DEFAULT_ID = "default-template";
export const TEMPLATE_CUSTOM_ID = "custom-template";
export const TEMPLATE_IMPORT_ID = "import-template";
export const TEMPLATE_NAME_QR_ID = "template-name-qr";
export const TEMPLATE_FULL_DETAIL_ID = "template-full-detail";

export const MIN_TAG_WIDTH_INCHES = 1;
export const MAX_TAG_WIDTH_INCHES = 6;
export const MIN_TAG_HEIGHT_INCHES = 0.5;
export const MAX_TAG_HEIGHT_INCHES = 4;
export const CSS_PIXELS_PER_INCH = 96;
export const TAG_HORIZONTAL_PADDING_INCHES = 0.16;
export const TAG_COLUMN_GAP_INCHES = 0.06;
export const MIN_FIT_FONT_SIZE_PX = 6;
export const AVERAGE_CHARACTER_WIDTH_EM = 0.56;
export const FIT_FONT_SCALE_BUFFER = 0.95;
export const QR_SIZE_INCHES = 0.5;
export const QR_OFFSET_INCHES = 0.06;
export const QR_TEXT_GAP_INCHES = 0.04;
export const QR_RESERVED_RIGHT_INCHES =
  QR_SIZE_INCHES + QR_OFFSET_INCHES + QR_TEXT_GAP_INCHES;
export const QR_RESERVED_BOTTOM_INCHES =
  QR_SIZE_INCHES + QR_OFFSET_INCHES + QR_TEXT_GAP_INCHES;
export const MIN_SHEET_PAGE_WIDTH_INCHES = MIN_TAG_WIDTH_INCHES;
export const MAX_SHEET_PAGE_WIDTH_INCHES = 24;
export const MIN_SHEET_PAGE_HEIGHT_INCHES = MIN_TAG_HEIGHT_INCHES;
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
    id: "custom",
    label: "Custom",
    widthInches: 3.5,
    heightInches: 1,
  },
];

export const FIELD_DISPLAY_NAMES: Record<TagFieldId, string> = {
  title: "Title",
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

export const FIELD_DEFAULTS: Record<
  TagFieldId,
  Pick<TagCell, "label" | "bold" | "fontSize">
> = {
  title: { label: "", bold: true, fontSize: 22 },
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

export const DEFAULT_ROWS: TagRow[] = [
  {
    id: "d0",
    cells: [
      {
        fieldId: "title",
        width: 1,
        textAlign: "center",
        fontSize: 22,
        overflow: false,
        fit: true,
        wrap: false,
        bold: true,
        italic: false,
        underline: false,
        label: "",
      },
    ],
  },
  {
    id: "d1",
    cells: [
      {
        fieldId: "hybridizer",
        width: 1,
        textAlign: "center",
        fontSize: 16,
        overflow: false,
        fit: true,
        wrap: false,
        bold: false,
        italic: false,
        underline: false,
        label: "",
      },
      {
        fieldId: "year",
        width: 1,
        textAlign: "left",
        fontSize: 16,
        overflow: false,
        fit: true,
        wrap: false,
        bold: false,
        italic: false,
        underline: false,
        label: "",
      },
      {
        fieldId: "ploidy",
        width: 1,
        textAlign: "center",
        fontSize: 16,
        overflow: false,
        fit: true,
        wrap: false,
        bold: false,
        italic: false,
        underline: false,
        label: "",
      },
    ],
  },
];

export const DEFAULT_TAG_DESIGNER_STATE: TagDesignerState = {
  sizePresetId: "brother-tze-1",
  customWidthInches: 3.5,
  customHeightInches: 1,
  showQrCode: true,
  rows: DEFAULT_ROWS,
};

export const PLACEHOLDER_LISTING: TagListingData = DEFAULT_LISTING;

let _nextRowId = 0;

export function generateRowId() {
  return `r-${Date.now()}-${_nextRowId++}`;
}

export function createTemplateCell(
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

export const BUILTIN_TAG_LAYOUT_TEMPLATES: Array<
  Omit<ResolvedTagLayoutTemplate, "isBuiltin" | "signature">
> = [
  {
    id: TEMPLATE_DEFAULT_ID,
    name: "name + hybridizer + year + ploidy + qr",
    layout: DEFAULT_TAG_DESIGNER_STATE,
  },
  {
    id: TEMPLATE_NAME_QR_ID,
    name: "name + qr",
    layout: {
      sizePresetId: "brother-tze-1",
      customWidthInches: 3.5,
      customHeightInches: 1,
      showQrCode: true,
      rows: [
        {
          id: "name-qr-row",
          cells: [createTemplateCell("title", { fontSize: 22, textAlign: "left" })],
        },
      ],
    },
  },
  {
    id: TEMPLATE_FULL_DETAIL_ID,
    name: "full detail",
    layout: {
      sizePresetId: "brother-tze-1",
      customWidthInches: 3.5,
      customHeightInches: 1,
      showQrCode: true,
      rows: [
        {
          id: "full-detail-row-0",
          cells: [createTemplateCell("title", { textAlign: "center" })],
        },
        {
          id: "full-detail-row-1",
          cells: [
            createTemplateCell("hybridizer", {
              label: "",
              textAlign: "center",
              fontSize: 16,
            }),
            createTemplateCell("year", {
              width: 1,
              label: "",
              textAlign: "left",
              fontSize: 16,
            }),
            createTemplateCell("ploidy", {
              width: 1,
              label: "",
              textAlign: "center",
              fontSize: 16,
            }),
          ],
        },
        {
          id: "full-detail-row-2",
          cells: [
            createTemplateCell("bloomSize", {
              width: 1,
              textAlign: "left",
              fontSize: 12,
              label: "Bloom Size",
              fit: false,
            }),
            createTemplateCell("color", {
              width: 1,
              textAlign: "right",
              fontSize: 16,
              bold: true,
            }),
          ],
        },
        {
          id: "full-detail-row-3",
          cells: [
            createTemplateCell("scapeHeight", {
              width: 1,
              textAlign: "left",
              fontSize: 12,
              label: "Scape Height",
              fit: false,
            }),
            createTemplateCell("form", {
              width: 1,
              textAlign: "right",
              fontSize: 16,
              bold: true,
            }),
          ],
        },
        {
          id: "full-detail-row-4",
          cells: [
            createTemplateCell("budcount", {
              width: 1,
              textAlign: "left",
              fontSize: 12,
              label: "Buds",
              fit: false,
            }),
            createTemplateCell("bloomSeason", {
              width: 1,
              textAlign: "right",
              fontSize: 12,
              label: "",
              italic: true,
            }),
          ],
        },
        {
          id: "full-detail-row-5",
          cells: [
            createTemplateCell("branches", {
              width: 1,
              textAlign: "left",
              fontSize: 12,
              label: "Branches",
              fit: false,
            }),
            createTemplateCell("bloomHabit", {
              width: 1,
              textAlign: "right",
              fontSize: 12,
              label: "",
              italic: true,
            }),
          ],
        },
      ],
    },
  },
];

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeInches(value: number) {
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

export function toNonEmptyString(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length === 0) return null;
  return trimmed;
}

export function trimTrailingSlash(value: string) {
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
    margin: 0,
    scalable: true,
  });
}

export function normalizeCellTextMode({
  overflow,
  fit,
  wrap,
}: {
  overflow?: boolean;
  fit?: boolean;
  wrap?: boolean;
}) {
  const hasOverflow = Boolean(overflow);
  const hasFit = typeof fit === "boolean" ? fit : true;
  const hasWrap = typeof wrap === "boolean" ? wrap : false;

  if (hasWrap) {
    return { overflow: false, fit: false, wrap: true };
  }
  if (hasOverflow) {
    return { overflow: true, fit: false, wrap: false };
  }
  if (hasFit) {
    return { overflow: false, fit: true, wrap: false };
  }
  return { overflow: false, fit: false, wrap: false };
}

export function normalizePloidy(value: string | null | undefined) {
  const normalized = toNonEmptyString(value);
  if (!normalized) return null;
  if (normalized.toLowerCase() === "tetraploid") return "tet";
  if (normalized.toLowerCase() === "diploid") return "dip";
  return normalized;
}

export function resolveFieldValue(
  listing: TagListingData,
  fieldId: TagFieldId,
): string | null {
  switch (fieldId) {
    case "title":
      return toNonEmptyString(listing.title);
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

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const VALID_TEXT_ALIGNS = new Set<TagTextAlign>(["left", "center", "right"]);
const VALID_FIELD_IDS = new Set<string>(ALL_FIELD_IDS);

export function sanitizeCell(cell: Partial<TagCell>): TagCell | null {
  if (!cell || typeof cell !== "object") return null;
  if (!cell.fieldId || !VALID_FIELD_IDS.has(cell.fieldId)) return null;

  const fieldId = cell.fieldId;
  const defaults = FIELD_DEFAULTS[fieldId];
  const textMode = normalizeCellTextMode({
    overflow: cell.overflow,
    fit: cell.fit,
    wrap: cell.wrap,
  });

  return {
    fieldId,
    width: clamp(Math.round(Number(cell.width) || 1), 1, 12),
    textAlign: VALID_TEXT_ALIGNS.has(cell.textAlign!)
      ? cell.textAlign!
      : "left",
    fontSize: clamp(Number(cell.fontSize) || defaults.fontSize, 6, 28),
    overflow: textMode.overflow,
    fit: textMode.fit,
    wrap: textMode.wrap,
    bold: typeof cell.bold === "boolean" ? cell.bold : defaults.bold,
    italic: Boolean(cell.italic),
    underline: Boolean(cell.underline),
    label: typeof cell.label === "string" ? cell.label : defaults.label,
  };
}

export function sanitizeRow(row: Partial<TagRow>): TagRow | null {
  if (!row || typeof row !== "object" || !Array.isArray(row.cells)) return null;

  const cells = (row.cells as Partial<TagCell>[])
    .map((c) => sanitizeCell(c))
    .filter((c): c is TagCell => c !== null);

  if (cells.length === 0) return null;

  return {
    id: typeof row.id === "string" && row.id ? row.id : generateRowId(),
    cells,
  };
}

export function sanitizeTagDesignerState(state: TagDesignerState): TagDesignerState {
  if (!Array.isArray((state as unknown as Record<string, unknown>).rows)) {
    return { ...DEFAULT_TAG_DESIGNER_STATE };
  }

  const presetExists = TAG_SIZE_PRESETS.some((p) => p.id === state.sizePresetId);

  const rows = (state.rows as Partial<TagRow>[])
    .map((r) => sanitizeRow(r))
    .filter((r): r is TagRow => r !== null);

  return {
    sizePresetId: presetExists
      ? state.sizePresetId
      : DEFAULT_TAG_DESIGNER_STATE.sizePresetId,
    customWidthInches: clamp(
      Number(state.customWidthInches) || DEFAULT_TAG_DESIGNER_STATE.customWidthInches,
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
    rows: rows.length > 0 ? rows : DEFAULT_TAG_DESIGNER_STATE.rows,
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
    rows: clamp(Math.round(rows ?? fallback.rows), MIN_SHEET_ROWS, MAX_SHEET_ROWS),
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

export function createLayoutSignature(layout: TagDesignerState) {
  const normalized = sanitizeTagDesignerState(layout);
  return JSON.stringify({
    sizePresetId: normalized.sizePresetId,
    customWidthInches: Number(normalized.customWidthInches.toFixed(2)),
    customHeightInches: Number(normalized.customHeightInches.toFixed(2)),
    showQrCode: normalized.showQrCode,
    rows: normalized.rows.map((row) => ({
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
  });
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
    const resolved: ResolvedCell[] = [];

    for (const cell of row.cells) {
      let text: string;
      if (cell.fieldId === "customText") {
        text = cell.label ?? "";
      } else {
        const value = resolveFieldValue(listing, cell.fieldId);
        text = value ? (cell.label ? `${cell.label}: ${value}` : value) : "";
      }

      resolved.push({
        id: `${listing.id}-${row.id}-${cell.fieldId}`,
        text,
        width: cell.width,
        textAlign: cell.textAlign,
        fontSize: cell.fontSize,
        overflow: cell.overflow,
        fit: cell.fit,
        wrap: cell.wrap,
        bold: cell.bold,
        italic: cell.italic,
        underline: cell.underline,
      });
    }

    if (resolved.length > 0) {
      result.push({ id: `${listing.id}-${row.id}`, cells: resolved });
    }
  }

  if (result.length === 0) {
    return [
      {
        id: `${listing.id}-placeholder`,
        cells: [
          {
            id: `${listing.id}-placeholder-cell`,
            text: "No fields with values",
            width: 1,
            textAlign: "left",
            fontSize: 10,
            overflow: false,
            fit: true,
            wrap: false,
            bold: false,
            italic: true,
            underline: false,
          },
        ],
      },
    ];
  }

  return result;
}

export function createDefaultCell(existingRows: TagRow[]): TagCell {
  const usedFields = new Set<TagFieldId>();
  for (const row of existingRows) {
    for (const cell of row.cells) {
      usedFields.add(cell.fieldId);
    }
  }

  const nextFieldId =
    ALL_FIELD_IDS.find((id) => !usedFields.has(id)) ?? "title";
  const defaults = FIELD_DEFAULTS[nextFieldId];

  return {
    fieldId: nextFieldId,
    width: 1,
    textAlign: "left",
    fontSize: defaults.fontSize,
    overflow: false,
    fit: true,
    wrap: false,
    bold: defaults.bold,
    italic: false,
    underline: false,
    label: defaults.label,
  };
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
      usedFieldIds.add(cell.fieldId);
    }
  }

  const includedFields = ALL_FIELD_IDS.filter(
    (id) => usedFieldIds.has(id) && id !== "customText",
  );
  if (!includedFields.length || !listings.length) return;

  const header = includedFields.map((id) => escapeCsvCell(FIELD_DISPLAY_NAMES[id]));
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

  const rowTotalWidthUnits = row.cells.reduce(
    (total, rowCell) => total + rowCell.width,
    0,
  );
  if (rowTotalWidthUnits <= 0) return cell.fontSize;

  const innerWidthInches =
    tagWidthInches -
    TAG_HORIZONTAL_PADDING_INCHES -
    (hasQrCode ? QR_RESERVED_RIGHT_INCHES : 0) -
    TAG_COLUMN_GAP_INCHES * Math.max(row.cells.length - 1, 0);
  if (innerWidthInches <= 0) return cell.fontSize;

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
