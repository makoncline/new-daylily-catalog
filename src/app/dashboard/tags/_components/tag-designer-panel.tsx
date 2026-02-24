"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Download,
  FileDown,
  FileImage,
  FileText,
  LayoutGrid,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import qrcodeGenerator from "qrcode-generator";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Field IDs – every AHS field + listing-level fields
// ---------------------------------------------------------------------------

const ALL_FIELD_IDS = [
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

type TagFieldId = (typeof ALL_FIELD_IDS)[number];
type TagTextAlign = "left" | "center" | "right";

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

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

const PLACEHOLDER_LISTING: TagListingData = {
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

// ---------------------------------------------------------------------------
// Designer state
// ---------------------------------------------------------------------------

interface TagSizePreset {
  id: string;
  label: string;
  widthInches: number;
  heightInches: number;
}

interface TagCell {
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

interface TagRow {
  id: string;
  cells: TagCell[];
}

interface TagDesignerState {
  sizePresetId: string;
  customWidthInches: number;
  customHeightInches: number;
  showQrCode: boolean;
  rows: TagRow[];
}

interface TagSheetCreatorState {
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

// ---------------------------------------------------------------------------
// Resolved types for preview / print
// ---------------------------------------------------------------------------

interface ResolvedCell {
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
}

interface TagPreviewData {
  id: string;
  rows: ResolvedRow[];
  qrCodeUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAG_DESIGNER_STORAGE_KEY = "tag-designer-state-v2";
const MIN_TAG_WIDTH_INCHES = 1;
const MAX_TAG_WIDTH_INCHES = 6;
const MIN_TAG_HEIGHT_INCHES = 0.5;
const MAX_TAG_HEIGHT_INCHES = 4;
const CSS_PIXELS_PER_INCH = 96;
const TAG_HORIZONTAL_PADDING_INCHES = 0.16;
const TAG_COLUMN_GAP_INCHES = 0.06;
const MIN_FIT_FONT_SIZE_PX = 6;
const AVERAGE_CHARACTER_WIDTH_EM = 0.56;
const FIT_FONT_SCALE_BUFFER = 0.95;
const QR_SIZE_INCHES = 0.5;
const QR_OFFSET_INCHES = 0.06;
const QR_TEXT_GAP_INCHES = 0.04;
const QR_RESERVED_RIGHT_INCHES =
  QR_SIZE_INCHES + QR_OFFSET_INCHES + QR_TEXT_GAP_INCHES;
const QR_RESERVED_BOTTOM_INCHES =
  QR_SIZE_INCHES + QR_OFFSET_INCHES + QR_TEXT_GAP_INCHES;
const TAG_TEMPLATE_LIBRARY_STORAGE_KEY = "tag-designer-templates-v1";
const TAG_SHEET_CREATOR_STORAGE_KEY = "tag-sheet-creator-state-v1";
const TEMPLATE_DEFAULT_ID = "default-template";
const TEMPLATE_CUSTOM_ID = "custom-template";
const TEMPLATE_IMPORT_ID = "import-template";
const TEMPLATE_NAME_QR_ID = "template-name-qr";
const TEMPLATE_FULL_DETAIL_ID = "template-full-detail";
const MIN_SHEET_PAGE_WIDTH_INCHES = MIN_TAG_WIDTH_INCHES;
const MAX_SHEET_PAGE_WIDTH_INCHES = 24;
const MIN_SHEET_PAGE_HEIGHT_INCHES = MIN_TAG_HEIGHT_INCHES;
const MAX_SHEET_PAGE_HEIGHT_INCHES = 24;
const MIN_SHEET_ROWS = 1;
const MAX_SHEET_ROWS = 20;
const MIN_SHEET_COLUMNS = 1;
const MAX_SHEET_COLUMNS = 20;
const MIN_SHEET_MARGIN_INCHES = 0;
const MAX_SHEET_MARGIN_INCHES = 6;
const MIN_SHEET_PADDING_INCHES = 0;
const MAX_SHEET_PADDING_INCHES = 6;
const MIN_SHEET_COPIES_PER_LABEL = 1;
const MAX_SHEET_COPIES_PER_LABEL = 500;

interface StoredTagLayoutTemplate {
  id: string;
  name: string;
  layout: TagDesignerState;
}

interface ResolvedTagLayoutTemplate extends StoredTagLayoutTemplate {
  isBuiltin: boolean;
  signature: string;
}

const TAG_SIZE_PRESETS: TagSizePreset[] = [
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

const FIELD_DISPLAY_NAMES: Record<TagFieldId, string> = {
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

const FIELD_DEFAULTS: Record<
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

let _nextRowId = 0;
function generateRowId() {
  return `r-${Date.now()}-${_nextRowId++}`;
}

const DEFAULT_ROWS: TagRow[] = [
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

const DEFAULT_TAG_DESIGNER_STATE: TagDesignerState = {
  sizePresetId: "brother-tze-1",
  customWidthInches: 3.5,
  customHeightInches: 1,
  showQrCode: true,
  rows: DEFAULT_ROWS,
};

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

const BUILTIN_TAG_LAYOUT_TEMPLATES: Array<
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

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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

function formatSheetNumberForInput(value: number, decimals: number) {
  if (decimals === 0) return String(Math.round(value));
  return value.toFixed(decimals);
}

function parseSheetNumberInput(input: string, decimals: number) {
  const parsed =
    decimals === 0
      ? Number.parseInt(input, 10)
      : Number.parseFloat(input);
  if (!Number.isFinite(parsed)) return null;
  if (decimals === 0 && !Number.isInteger(parsed)) return null;
  return parsed;
}

function normalizeSheetNumber(
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

function buildPublicListingUrl(
  baseUrl: string,
  userId: string,
  listingId: string,
) {
  return `${trimTrailingSlash(baseUrl)}/${encodeURIComponent(
    userId,
  )}?viewing=${encodeURIComponent(listingId)}`;
}

function buildQrCodeSvgMarkup(url: string) {
  const qrCode = qrcodeGenerator(0, "M");
  qrCode.addData(url);
  qrCode.make();
  return qrCode.createSvgTag({
    cellSize: 1,
    margin: 0,
    scalable: true,
  });
}

function normalizeCellTextMode({
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

const VALID_TEXT_ALIGNS = new Set<TagTextAlign>(["left", "center", "right"]);
const VALID_FIELD_IDS = new Set<string>(ALL_FIELD_IDS);

function sanitizeCell(cell: Partial<TagCell>): TagCell | null {
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

function sanitizeRow(row: Partial<TagRow>): TagRow | null {
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

function sanitizeTagDesignerState(state: TagDesignerState): TagDesignerState {
  if (!Array.isArray((state as unknown as Record<string, unknown>).rows)) {
    return { ...DEFAULT_TAG_DESIGNER_STATE };
  }

  const presetExists = TAG_SIZE_PRESETS.some(
    (p) => p.id === state.sizePresetId,
  );

  const rows = (state.rows as Partial<TagRow>[])
    .map((r) => sanitizeRow(r))
    .filter((r): r is TagRow => r !== null);

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
    rows: rows.length > 0 ? rows : DEFAULT_TAG_DESIGNER_STATE.rows,
  };
}

function createDefaultSheetCreatorState({
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

function sanitizeTagSheetCreatorState(
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

interface ResolvedSheetMetrics {
  tagsPerSheet: number;
  slotWidthInches: number;
  slotHeightInches: number;
  requiredWidthInches: number;
  requiredHeightInches: number;
  isValid: boolean;
}

function resolveSheetMetrics(
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

function createLayoutSignature(layout: TagDesignerState) {
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

function sanitizeStoredTemplate(
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

// ---------------------------------------------------------------------------
// Build resolved rows for a listing
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Print document HTML
// ---------------------------------------------------------------------------

function cellStyleAsCss(cell: ResolvedCell) {
  return [
    `font-size: ${cell.fontSize}px`,
    `font-weight: ${cell.bold ? 700 : 400}`,
    `font-style: ${cell.italic ? "italic" : "normal"}`,
    `text-decoration: ${cell.underline ? "underline" : "none"}`,
    `text-align: ${cell.textAlign}`,
    `overflow: ${cell.overflow ? "visible" : "hidden"}`,
    `white-space: ${cell.wrap ? "normal" : "nowrap"}`,
    `overflow-wrap: ${cell.wrap ? "anywhere" : "normal"}`,
  ].join("; ");
}

function resolveCellFontSizePx(
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

export function createTagPrintDocumentHtml({
  tags,
  widthInches,
  heightInches,
  mode = "print",
}: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
  mode?: "print" | "raster";
}) {
  const isRasterMode = mode === "raster";
  const rowAlignItems = isRasterMode ? "start" : "baseline";
  const rowMarginTopPixels = isRasterMode ? 2 : 1;
  const cellLineHeight = isRasterMode ? 1.28 : 1.2;
  const cellPaddingTop = isRasterMode ? "0.03em" : "0";
  const cellPaddingBottom = isRasterMode ? "0.08em" : "0";

  const tagMarkup = tags
    .map((tag) => {
      const hasQrCode = Boolean(tag.qrCodeUrl);
      const rowsHtml = tag.rows
        .map((row) => {
          const cols = row.cells.map((c) => `${c.width}fr`).join(" ");
          const cellsHtml = row.cells
            .map((cell) => {
              const fittedCell = {
                ...cell,
                fontSize: resolveCellFontSizePx(
                  cell,
                  row,
                  widthInches,
                  hasQrCode,
                ),
              };
              return `<div class="cell" style="${cellStyleAsCss(fittedCell)}">${escapeHtml(cell.text)}</div>`;
            })
            .join("");
          return `<div class="row" style="grid-template-columns: ${cols};">${cellsHtml}</div>`;
        })
        .join("");

      const qrSvgMarkup =
        tag.qrCodeUrl !== null && tag.qrCodeUrl !== undefined
          ? buildQrCodeSvgMarkup(tag.qrCodeUrl)
          : "";
      const qrHtml = qrSvgMarkup ? `<div class="qr">${qrSvgMarkup}</div>` : "";
      const hasQrClass = hasQrCode ? " has-qr" : "";

      return `<article class="tag${hasQrClass}"><div class="tag-content">${rowsHtml}</div>${qrHtml}</article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Daylily Tag Print</title>
    <style>
      * { box-sizing: border-box; }
      @page {
        size: ${widthInches}in ${heightInches}in;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        font-family: Arial, sans-serif;
        color: #111;
      }
      .sheet {
        margin: 0;
        padding: 0;
      }
      .tag {
        width: ${widthInches}in;
        height: ${heightInches}in;
        padding: 0.06in 0.08in;
        overflow: hidden;
        position: relative;
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-after: always;
        break-after: page;
      }
      .tag:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
      .tag.has-qr .tag-content {
        padding-right: ${QR_RESERVED_RIGHT_INCHES}in;
        padding-bottom: ${QR_RESERVED_BOTTOM_INCHES}in;
      }
      .row {
        display: grid;
        column-gap: 0.06in;
        align-items: ${rowAlignItems};
      }
      .row + .row {
        margin-top: ${rowMarginTopPixels}px;
      }
      .cell {
        line-height: ${cellLineHeight};
        padding-top: ${cellPaddingTop};
        padding-bottom: ${cellPaddingBottom};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
      }
      .qr {
        position: absolute;
        right: ${QR_OFFSET_INCHES}in;
        bottom: ${QR_OFFSET_INCHES}in;
        width: ${QR_SIZE_INCHES}in;
        height: ${QR_SIZE_INCHES}in;
        background: #fff;
      }
      .qr svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <main class="sheet">${tagMarkup}</main>
  </body>
</html>`;
}

export function createTagSheetDocumentHtml({
  tags,
  sheetState,
  tagWidthInches,
  tagHeightInches,
}: {
  tags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
}) {
  const sheetMetrics = resolveSheetMetrics(sheetState, {
    tagWidthInches,
    tagHeightInches,
  });
  if (!sheetMetrics.isValid) return null;

  const rowAlignItems = "baseline";
  const rowMarginTopPixels = 1;
  const cellLineHeight = 1.2;
  const cellPaddingTop = "0";
  const cellPaddingBottom = "0";
  const tagBorderCss = sheetState.printDashedBorders
    ? "1px dashed #d4d4d8"
    : "none";
  const slotWidthInches = sheetMetrics.slotWidthInches;
  const slotHeightInches = sheetMetrics.slotHeightInches;

  const sheetTags: TagPreviewData[][] = [];
  for (let index = 0; index < tags.length; index += sheetMetrics.tagsPerSheet) {
    sheetTags.push(tags.slice(index, index + sheetMetrics.tagsPerSheet));
  }

  const sheetMarkup = sheetTags
    .map((sheetTagList) => {
      const tagMarkup = sheetTagList
        .map((tag) => {
          const hasQrCode = Boolean(tag.qrCodeUrl);
          const rowsHtml = tag.rows
            .map((row) => {
              const cols = row.cells.map((c) => `${c.width}fr`).join(" ");
              const cellsHtml = row.cells
                .map((cell) => {
                  const fittedCell = {
                    ...cell,
                    fontSize: resolveCellFontSizePx(
                      cell,
                      row,
                      slotWidthInches,
                      hasQrCode,
                    ),
                  };
                  return `<div class="cell" style="${cellStyleAsCss(fittedCell)}">${escapeHtml(cell.text)}</div>`;
                })
                .join("");
              return `<div class="row" style="grid-template-columns: ${cols};">${cellsHtml}</div>`;
            })
            .join("");

          const qrSvgMarkup =
            tag.qrCodeUrl !== null && tag.qrCodeUrl !== undefined
              ? buildQrCodeSvgMarkup(tag.qrCodeUrl)
              : "";
          const qrHtml = qrSvgMarkup ? `<div class="qr">${qrSvgMarkup}</div>` : "";
          const hasQrClass = hasQrCode ? " has-qr" : "";

          return `<article class="tag${hasQrClass}"><div class="tag-content">${rowsHtml}</div>${qrHtml}</article>`;
        })
        .join("");

      return `<section class="sheet-page">${tagMarkup}</section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Daylily Tag Sheets</title>
    <style>
      * { box-sizing: border-box; }
      @page {
        size: ${sheetState.pageWidthInches}in ${sheetState.pageHeightInches}in;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        font-family: Arial, sans-serif;
        color: #111;
      }
      .sheet-page {
        width: ${sheetState.pageWidthInches}in;
        height: ${sheetState.pageHeightInches}in;
        padding: ${sheetState.marginYInches}in ${sheetState.marginXInches}in;
        display: grid;
        grid-template-columns: repeat(${sheetState.columns}, ${slotWidthInches}in);
        grid-template-rows: repeat(${sheetState.rows}, ${slotHeightInches}in);
        column-gap: ${sheetState.paddingXInches}in;
        row-gap: ${sheetState.paddingYInches}in;
        justify-content: start;
        align-content: start;
        page-break-after: always;
        break-after: page;
      }
      .sheet-page:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
      .tag {
        width: ${slotWidthInches}in;
        height: ${slotHeightInches}in;
        padding: 0.06in 0.08in;
        border: ${tagBorderCss};
        overflow: hidden;
        position: relative;
      }
      .tag.has-qr .tag-content {
        padding-right: ${QR_RESERVED_RIGHT_INCHES}in;
        padding-bottom: ${QR_RESERVED_BOTTOM_INCHES}in;
      }
      .row {
        display: grid;
        column-gap: 0.06in;
        align-items: ${rowAlignItems};
      }
      .row + .row {
        margin-top: ${rowMarginTopPixels}px;
      }
      .cell {
        line-height: ${cellLineHeight};
        padding-top: ${cellPaddingTop};
        padding-bottom: ${cellPaddingBottom};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
      }
      .qr {
        position: absolute;
        right: ${QR_OFFSET_INCHES}in;
        bottom: ${QR_OFFSET_INCHES}in;
        width: ${QR_SIZE_INCHES}in;
        height: ${QR_SIZE_INCHES}in;
        background: #fff;
      }
      .qr svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    ${sheetMarkup}
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Print via hidden iframe
// ---------------------------------------------------------------------------

interface PreparedTagDocumentFrame {
  iframe: HTMLIFrameElement;
  iframeWindow: Window;
  cleanup: () => void;
}

function prepareTagDocumentFrame(html: string): PreparedTagDocumentFrame | null {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "8.5in";
  iframe.style.height = "11in";
  iframe.style.border = "0";

  const cleanup = () => iframe.remove();

  document.body.appendChild(iframe);

  const frameDocument = iframe.contentDocument;
  const iframeWindow = iframe.contentWindow;
  if (!frameDocument || !iframeWindow) {
    cleanup();
    toast.error("Unable to prepare tag document.");
    return null;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  return { iframe, iframeWindow, cleanup };
}

function printTagDocument(html: string) {
  const preparedFrame = prepareTagDocumentFrame(html);
  if (!preparedFrame) return;

  window.setTimeout(() => {
    preparedFrame.iframeWindow.focus();
    preparedFrame.iframeWindow.print();
    window.setTimeout(preparedFrame.cleanup, 1000);
  }, 200);
}

// ---------------------------------------------------------------------------
// Export downloads
// ---------------------------------------------------------------------------

function waitForFrameRender(frameWindow: Window) {
  return new Promise<void>((resolve) => {
    frameWindow.requestAnimationFrame(() => resolve());
  });
}

function buildTagExportDateStamp() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}${month}${day}`;
}

function buildTagsHtmlFilename() {
  return `daylily-tags-${buildTagExportDateStamp()}.html`;
}

function buildTagSheetsHtmlFilename() {
  return `daylily-tag-sheets-${buildTagExportDateStamp()}.html`;
}

function buildTagSheetsPdfFilename() {
  return `daylily-tag-sheets-${buildTagExportDateStamp()}.pdf`;
}

function buildTagSheetImagesZipFilename() {
  return `daylily-tag-sheet-images-${buildTagExportDateStamp()}.zip`;
}

function buildTagsPdfFilename() {
  return `daylily-tags-${buildTagExportDateStamp()}.pdf`;
}

function buildTagImagesZipFilename() {
  return `daylily-tag-images-${buildTagExportDateStamp()}.zip`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadTagDocumentHtml(
  html: string,
  filename: string = buildTagsHtmlFilename(),
) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  triggerBlobDownload(blob, filename);
}

type Html2CanvasRenderer = (
  element: HTMLElement,
  options: {
    backgroundColor: string;
    scale: number;
    foreignObjectRendering: boolean;
    logging: boolean;
    useCORS: boolean;
    width: number;
    height: number;
  },
) => Promise<HTMLCanvasElement>;

async function renderSingleTagCanvas({
  tag,
  widthInches,
  heightInches,
  html2canvas,
}: {
  tag: TagPreviewData;
  widthInches: number;
  heightInches: number;
  html2canvas: Html2CanvasRenderer;
}) {
  const html = createTagPrintDocumentHtml({
    tags: [tag],
    widthInches,
    heightInches,
    mode: "raster",
  });
  const preparedFrame = prepareTagDocumentFrame(html);
  if (!preparedFrame) return null;

  try {
    const frameDocument = preparedFrame.iframe.contentDocument;
    if (!frameDocument) return null;

    if (frameDocument.fonts) {
      await frameDocument.fonts.ready;
    }
    await waitForFrameRender(preparedFrame.iframeWindow);
    await waitForFrameRender(preparedFrame.iframeWindow);

    const tagElement = frameDocument.querySelector<HTMLElement>(".tag");
    if (!tagElement) return null;

    const canvas = await html2canvas(tagElement, {
      backgroundColor: "#ffffff",
      scale: 3,
      foreignObjectRendering: true,
      logging: false,
      useCORS: true,
      width: tagElement.offsetWidth,
      height: tagElement.offsetHeight,
    });

    return canvas;
  } finally {
    preparedFrame.cleanup();
  }
}

async function renderTagCanvasesForExport({
  tags,
  widthInches,
  heightInches,
}: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
}) {
  if (!tags.length) return null;

  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvases: HTMLCanvasElement[] = [];

    for (const tag of tags) {
      const canvas = await renderSingleTagCanvas({
        tag,
        widthInches,
        heightInches,
        html2canvas,
      });
      if (!canvas) {
        toast.error("Unable to prepare tag export.");
        return null;
      }

      canvases.push(canvas);
    }

    return canvases;
  } catch (error) {
    console.error("Failed to render tag canvases for export", error);
    toast.error("Unable to render tag export.");
    return null;
  }
}

function chunkTags<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function duplicateTagsForSheetLabels(
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

async function renderSingleSheetCanvas({
  sheetTags,
  sheetState,
  tagWidthInches,
  tagHeightInches,
  html2canvas,
}: {
  sheetTags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
  html2canvas: Html2CanvasRenderer;
}) {
  const html = createTagSheetDocumentHtml({
    tags: sheetTags,
    sheetState,
    tagWidthInches,
    tagHeightInches,
  });
  if (!html) return null;

  const preparedFrame = prepareTagDocumentFrame(html);
  if (!preparedFrame) return null;

  try {
    const frameDocument = preparedFrame.iframe.contentDocument;
    if (!frameDocument) return null;

    if (frameDocument.fonts) {
      await frameDocument.fonts.ready;
    }
    await waitForFrameRender(preparedFrame.iframeWindow);
    await waitForFrameRender(preparedFrame.iframeWindow);

    const sheetElement = frameDocument.querySelector<HTMLElement>(".sheet-page");
    if (!sheetElement) return null;

    const canvas = await html2canvas(sheetElement, {
      backgroundColor: "#ffffff",
      scale: 2,
      foreignObjectRendering: true,
      logging: false,
      useCORS: true,
      width: sheetElement.offsetWidth,
      height: sheetElement.offsetHeight,
    });

    return canvas;
  } finally {
    preparedFrame.cleanup();
  }
}

async function renderSheetCanvasesForExport({
  tags,
  sheetState,
  tagWidthInches,
  tagHeightInches,
}: {
  tags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
}) {
  if (!tags.length) return null;

  const metrics = resolveSheetMetrics(sheetState, {
    tagWidthInches,
    tagHeightInches,
  });
  if (!metrics.isValid) return null;

  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvases: HTMLCanvasElement[] = [];
    const sheets = chunkTags(tags, metrics.tagsPerSheet);

    for (const sheetTags of sheets) {
      const canvas = await renderSingleSheetCanvas({
        sheetTags,
        sheetState,
        tagWidthInches,
        tagHeightInches,
        html2canvas,
      });
      if (!canvas) {
        toast.error("Unable to prepare sheet export.");
        return null;
      }
      canvases.push(canvas);
    }

    return canvases;
  } catch (error) {
    console.error("Failed to render sheet canvases for export", error);
    toast.error("Unable to render sheet export.");
    return null;
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Canvas toBlob returned null"));
      },
      "image/png",
      1,
    );
  });
}

async function downloadTagDocumentPdf({
  tags,
  widthInches,
  heightInches,
}: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
}) {
  const canvases = await renderTagCanvasesForExport({
    tags,
    widthInches,
    heightInches,
  });
  if (!canvases || canvases.length === 0) return false;

  try {
    const { jsPDF } = await import("jspdf");
    const pageWidthPoints = Number((widthInches * 72).toFixed(2));
    const pageHeightPoints = Number((heightInches * 72).toFixed(2));
    const pdf = new jsPDF({
      orientation:
        pageWidthPoints >= pageHeightPoints ? "landscape" : "portrait",
      unit: "pt",
      format: [pageWidthPoints, pageHeightPoints],
      compress: true,
    });

    canvases.forEach((canvas, index) => {
      if (index > 0) {
        pdf.addPage([pageWidthPoints, pageHeightPoints]);
      }
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageWidthPoints,
        pageHeightPoints,
        undefined,
        "FAST",
      );
    });

    pdf.save(buildTagsPdfFilename());
    return true;
  } catch (error) {
    console.error("Failed to export tags as PDF", error);
    toast.error("Unable to export PDF.");
    return false;
  }
}

async function downloadTagImagesZip({
  tags,
  widthInches,
  heightInches,
}: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
}) {
  const canvases = await renderTagCanvasesForExport({
    tags,
    widthInches,
    heightInches,
  });
  if (!canvases || canvases.length === 0) return false;

  try {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const folder = zip.folder("daylily-tags");

    for (const [index, canvas] of canvases.entries()) {
      const fileName = `tag-${String(index + 1).padStart(3, "0")}.png`;
      const blob = await canvasToPngBlob(canvas);
      folder?.file(fileName, blob);
    }

    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    triggerBlobDownload(zipBlob, buildTagImagesZipFilename());
    return true;
  } catch (error) {
    console.error("Failed to export tag images zip", error);
    toast.error("Unable to export images.");
    return false;
  }
}

async function downloadTagSheetsPdf({
  tags,
  sheetState,
  tagWidthInches,
  tagHeightInches,
}: {
  tags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
}) {
  const canvases = await renderSheetCanvasesForExport({
    tags,
    sheetState,
    tagWidthInches,
    tagHeightInches,
  });
  if (!canvases || canvases.length === 0) return false;

  try {
    const { jsPDF } = await import("jspdf");
    const pageWidthPoints = Number((sheetState.pageWidthInches * 72).toFixed(2));
    const pageHeightPoints = Number((sheetState.pageHeightInches * 72).toFixed(2));
    const pdf = new jsPDF({
      orientation:
        pageWidthPoints >= pageHeightPoints ? "landscape" : "portrait",
      unit: "pt",
      format: [pageWidthPoints, pageHeightPoints],
      compress: true,
    });

    canvases.forEach((canvas, index) => {
      if (index > 0) {
        pdf.addPage([pageWidthPoints, pageHeightPoints]);
      }
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageWidthPoints,
        pageHeightPoints,
        undefined,
        "FAST",
      );
    });

    pdf.save(buildTagSheetsPdfFilename());
    return true;
  } catch (error) {
    console.error("Failed to export tag sheets as PDF", error);
    toast.error("Unable to export sheet PDF.");
    return false;
  }
}

async function downloadTagSheetImagesZip({
  tags,
  sheetState,
  tagWidthInches,
  tagHeightInches,
}: {
  tags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  tagWidthInches: number;
  tagHeightInches: number;
}) {
  const canvases = await renderSheetCanvasesForExport({
    tags,
    sheetState,
    tagWidthInches,
    tagHeightInches,
  });
  if (!canvases || canvases.length === 0) return false;

  try {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const folder = zip.folder("daylily-tag-sheets");

    for (const [index, canvas] of canvases.entries()) {
      const fileName = `sheet-${String(index + 1).padStart(3, "0")}.png`;
      const blob = await canvasToPngBlob(canvas);
      folder?.file(fileName, blob);
    }

    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    triggerBlobDownload(zipBlob, buildTagSheetImagesZipFilename());
    return true;
  } catch (error) {
    console.error("Failed to export tag sheet images zip", error);
    toast.error("Unable to export sheet images.");
    return false;
  }
}

// ---------------------------------------------------------------------------
// CSV download
// ---------------------------------------------------------------------------

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function downloadSelectedListingsCsv(
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

// ---------------------------------------------------------------------------
// Cell default factory
// ---------------------------------------------------------------------------

function createDefaultCell(existingRows: TagRow[]): TagCell {
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

// ---------------------------------------------------------------------------
// Cell editor component
// ---------------------------------------------------------------------------

const CELL_GRID =
  "grid grid-cols-[3rem_7rem_5rem_2.5rem_3rem_3rem_8rem_max-content_1.5rem] items-center justify-items-start gap-x-1.5";

interface TagCellEditorProps {
  cell: TagCell;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (cell: TagCell) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function TagCellEditor({
  cell,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TagCellEditorProps) {
  const patch = (partial: Partial<TagCell>) =>
    onUpdate({ ...cell, ...partial });

  const commitWidthDraft = (inputElement: HTMLInputElement) => {
    const parsedWidth = Number.parseInt(inputElement.value.trim(), 10);
    const nextWidth = Number.isFinite(parsedWidth)
      ? clamp(parsedWidth, 1, 12)
      : cell.width;
    patch({ width: nextWidth });
    inputElement.value = String(nextWidth);
  };

  const commitFontSizeDraft = (inputElement: HTMLInputElement) => {
    const parsedFontSize = Number.parseInt(inputElement.value.trim(), 10);
    const nextFontSize = Number.isFinite(parsedFontSize)
      ? clamp(parsedFontSize, 6, 28)
      : cell.fontSize;
    patch({ fontSize: nextFontSize });
    inputElement.value = String(nextFontSize);
  };

  return (
    <div className={CELL_GRID}>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 px-0"
          disabled={isFirst}
          onClick={onMoveUp}
          title="Move cell left"
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 px-0"
          disabled={isLast}
          onClick={onMoveDown}
          title="Move cell right"
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>

      <select
        className="border-border bg-background h-7 w-full rounded border px-1 text-xs"
        value={cell.fieldId}
        onChange={(e) => {
          const newId = e.target.value as TagFieldId;
          const defaults = FIELD_DEFAULTS[newId];
          onUpdate({
            ...cell,
            fieldId: newId,
            label: defaults.label,
            bold: defaults.bold,
            fontSize: defaults.fontSize,
          });
        }}
      >
        {ALL_FIELD_IDS.map((id) => (
          <option key={id} value={id}>
            {FIELD_DISPLAY_NAMES[id]}
          </option>
        ))}
      </select>

      <Input
        value={cell.label}
        onChange={(e) => patch({ label: e.target.value })}
        placeholder={cell.fieldId === "customText" ? "Text" : "Label"}
        className="h-7 px-1 text-xs"
        title={
          cell.fieldId === "customText"
            ? "Static text (leave empty for blank cell)"
            : "Label prefix (leave empty for no label)"
        }
      />

      <Input
        key={`cell-width-${cell.fieldId}-${cell.width}`}
        type="number"
        inputMode="numeric"
        min={1}
        max={12}
        step={1}
        defaultValue={cell.width}
        onBlur={(event) => commitWidthDraft(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-7 px-1 text-center text-xs"
        title="Column width (fr units)"
      />

      <select
        className="border-border bg-background h-7 w-full rounded border px-0.5 text-xs"
        value={cell.textAlign}
        onChange={(e) => patch({ textAlign: e.target.value as TagTextAlign })}
        title="Text alignment"
      >
        <option value="left">L</option>
        <option value="center">C</option>
        <option value="right">R</option>
      </select>

      <Input
        key={`cell-font-${cell.fieldId}-${cell.fontSize}`}
        type="number"
        inputMode="numeric"
        min={6}
        max={28}
        step={1}
        defaultValue={cell.fontSize}
        onBlur={(event) => commitFontSizeDraft(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-7 px-1 text-center text-xs"
        title="Font size (px)"
      />

      <div className="flex items-center gap-2 text-[10px] leading-none">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={cell.overflow}
            onChange={(e) =>
              patch(
                e.target.checked
                  ? { overflow: true, fit: false, wrap: false }
                  : { overflow: false },
              )
            }
            className="h-3 w-3"
          />
          Ov
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={cell.fit}
            onChange={(e) =>
              patch(
                e.target.checked
                  ? { overflow: false, fit: true, wrap: false }
                  : { fit: false },
              )
            }
            className="h-3 w-3"
          />
          Fit
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={cell.wrap}
            onChange={(e) =>
              patch(
                e.target.checked
                  ? { overflow: false, fit: false, wrap: true }
                  : { wrap: false },
              )
            }
            className="h-3 w-3"
          />
          Wrap
        </label>
      </div>

      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant={cell.bold ? "default" : "outline"}
          size="sm"
          className="h-6 w-6 px-0 text-xs"
          onClick={() => patch({ bold: !cell.bold })}
          title="Bold"
        >
          B
        </Button>
        <Button
          type="button"
          variant={cell.italic ? "default" : "outline"}
          size="sm"
          className="h-6 w-6 px-0 text-xs italic"
          onClick={() => patch({ italic: !cell.italic })}
          title="Italic"
        >
          I
        </Button>
        <Button
          type="button"
          variant={cell.underline ? "default" : "outline"}
          size="sm"
          className="h-6 w-6 px-0 text-xs underline"
          onClick={() => patch({ underline: !cell.underline })}
          title="Underline"
        >
          U
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 px-0"
        onClick={onRemove}
        title="Remove cell"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function QrCodeSvg({
  qrCodeUrl,
  className,
  style,
}: {
  qrCodeUrl: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const qrSvgMarkup = React.useMemo(
    () => buildQrCodeSvgMarkup(qrCodeUrl),
    [qrCodeUrl],
  );

  return (
    <div
      aria-hidden="true"
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
    />
  );
}

type UpdateTagDesignerState = (
  updater: (previous: TagDesignerState) => TagDesignerState,
) => void;

interface TagDesignerHeaderProps {
  selectedListingCount: number;
  onDownloadCsv: () => void;
  onDownloadPages: () => void;
  onDownloadPdf: () => void;
  onDownloadImages: () => void;
  onOpenSheetCreator: () => void;
  onPrint: () => void;
  isPreparingDownload: boolean;
}

function TagDesignerHeader({
  selectedListingCount,
  onDownloadCsv,
  onDownloadPages,
  onDownloadPdf,
  onDownloadImages,
  onOpenSheetCreator,
  onPrint,
  isPreparingDownload,
}: TagDesignerHeaderProps) {
  const hasListings = selectedListingCount > 0;

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold">Tag Designer</h2>
        <p className="text-muted-foreground text-sm">
          {selectedListingCount} selected listing
          {selectedListingCount === 1 ? "" : "s"}. Build your tag layout
          row-by-row.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={!hasListings || isPreparingDownload}>
              <Download className="mr-2 h-4 w-4" />
              {isPreparingDownload ? "Preparing..." : "Download"}
              <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={() => onDownloadPages()}
              disabled={isPreparingDownload}
            >
              <FileDown className="h-4 w-4" />
              Pages (.html)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDownloadPdf()}
              disabled={isPreparingDownload}
            >
              <FileText className="h-4 w-4" />
              PDF (.pdf)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDownloadImages()}
              disabled={isPreparingDownload}
            >
              <FileImage className="h-4 w-4" />
              Images (.zip)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDownloadCsv()}
              disabled={isPreparingDownload}
            >
              <Download className="h-4 w-4" />
              CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenSheetCreator}
          disabled={!hasListings}
        >
          <LayoutGrid className="mr-2 h-4 w-4" />
          Make Sheet
        </Button>
        <Button onClick={onPrint} disabled={!hasListings}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}

type UpdateTagSheetCreatorState = (
  updater: (previous: TagSheetCreatorState) => TagSheetCreatorState,
) => void;

interface SheetNumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  onCommit: (nextValue: number) => void;
}

function SheetNumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  decimals,
  onCommit,
}: SheetNumberFieldProps) {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const rangeText = React.useMemo(() => {
    const minText = formatSheetNumberForInput(min, decimals);
    const maxText = formatSheetNumberForInput(max, decimals);
    const prefix = decimals === 0 ? "whole number" : "number";
    return `Enter a ${prefix} between ${minText} and ${maxText}.`;
  }, [decimals, max, min]);

  const commitDraftValue = React.useCallback(
    (inputElement: HTMLInputElement) => {
      const trimmedValue = inputElement.value.trim();
      const parsedValue = parseSheetNumberInput(trimmedValue, decimals);
      if (parsedValue === null || parsedValue < min || parsedValue > max) {
        setErrorMessage(`${rangeText} Type a value and leave the field.`);
        return;
      }

      const normalizedValue = normalizeSheetNumber(
        parsedValue,
        min,
        max,
        decimals,
      );
      onCommit(normalizedValue);
      inputElement.value = formatSheetNumberForInput(normalizedValue, decimals);
      setErrorMessage(null);
    },
    [decimals, max, min, onCommit, rangeText],
  );

  const stepValue = React.useCallback(
    (direction: -1 | 1) => {
      const nextValue = normalizeSheetNumber(
        value + step * direction,
        min,
        max,
        decimals,
      );
      onCommit(nextValue);
      setErrorMessage(null);
    },
    [decimals, max, min, onCommit, step, value],
  );

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label={`Decrease ${label}`}
          onClick={() => stepValue(-1)}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Input
          key={`${id}-${value}`}
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          inputMode={decimals === 0 ? "numeric" : "decimal"}
          defaultValue={formatSheetNumberForInput(value, decimals)}
          onChange={() => {
            if (errorMessage) setErrorMessage(null);
          }}
          onBlur={(event) => commitDraftValue(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.currentTarget.value = formatSheetNumberForInput(
                value,
                decimals,
              );
              setErrorMessage(null);
              event.currentTarget.blur();
            }
          }}
          className={cn(errorMessage ? "border-destructive" : undefined)}
          aria-invalid={errorMessage ? "true" : "false"}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label={`Increase ${label}`}
          onClick={() => stepValue(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {errorMessage ? (
        <p id={`${id}-error`} className="text-destructive text-xs">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

interface TagSheetCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLabelCount: number;
  copiesPerLabel: number;
  onCopiesPerLabelChange: (nextCopiesPerLabel: number) => void;
  previewTags: TagPreviewData[];
  sheetState: TagSheetCreatorState;
  sheetMetrics: ResolvedSheetMetrics;
  updateSheetState: UpdateTagSheetCreatorState;
  onDownloadSheetPages: () => void;
  onDownloadSheetPdf: () => void;
  onDownloadSheetImages: () => void;
  onPrintSheets: () => void;
  onResetToSingleTag: () => void;
  isPreparingDownload: boolean;
}

function TagSheetCreatorDialog({
  open,
  onOpenChange,
  selectedLabelCount,
  copiesPerLabel,
  onCopiesPerLabelChange,
  previewTags,
  sheetState,
  sheetMetrics,
  updateSheetState,
  onDownloadSheetPages,
  onDownloadSheetPdf,
  onDownloadSheetImages,
  onPrintSheets,
  onResetToSingleTag,
  isPreparingDownload,
}: TagSheetCreatorDialogProps) {
  const [isPrintQuantityOpen, setIsPrintQuantityOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setIsPrintQuantityOpen(false);
  }, [open]);

  const totalLabelCount = selectedLabelCount * copiesPerLabel;
  const estimatedSheetCount =
    sheetMetrics.tagsPerSheet > 0
      ? Math.ceil(totalLabelCount / sheetMetrics.tagsPerSheet)
      : 0;
  const firstSheetPreviewTags = React.useMemo(
    () => previewTags.slice(0, sheetMetrics.tagsPerSheet),
    [previewTags, sheetMetrics.tagsPerSheet],
  );
  const pageWidthPx = sheetState.pageWidthInches * CSS_PIXELS_PER_INCH;
  const pageHeightPx = sheetState.pageHeightInches * CSS_PIXELS_PER_INCH;
  const slotWidthPx = sheetMetrics.slotWidthInches * CSS_PIXELS_PER_INCH;
  const slotHeightPx = sheetMetrics.slotHeightInches * CSS_PIXELS_PER_INCH;
  const marginXPx = sheetState.marginXInches * CSS_PIXELS_PER_INCH;
  const marginYPx = sheetState.marginYInches * CSS_PIXELS_PER_INCH;
  const paddingXPx = sheetState.paddingXInches * CSS_PIXELS_PER_INCH;
  const paddingYPx = sheetState.paddingYInches * CSS_PIXELS_PER_INCH;
  const previewMaxWidthPx = 560;
  const previewScale =
    pageWidthPx > 0 ? Math.min(previewMaxWidthPx / pageWidthPx, 1) : 1;
  const canExport = sheetMetrics.isValid && totalLabelCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sheet Creator</DialogTitle>
          <DialogDescription>
            Arrange selected tags onto printable sheets. Use the print dialog to
            print on paper or Save as PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <SheetNumberField
            id="sheet-page-width"
            label="Page width (in)"
            value={sheetState.pageWidthInches}
            min={MIN_SHEET_PAGE_WIDTH_INCHES}
            max={MAX_SHEET_PAGE_WIDTH_INCHES}
            step={0.01}
            decimals={2}
            onCommit={(nextValue) =>
              updateSheetState((previous) => ({
                ...previous,
                pageWidthInches: nextValue,
              }))
            }
          />

          <SheetNumberField
            id="sheet-page-height"
            label="Page height (in)"
            value={sheetState.pageHeightInches}
            min={MIN_SHEET_PAGE_HEIGHT_INCHES}
            max={MAX_SHEET_PAGE_HEIGHT_INCHES}
            step={0.01}
            decimals={2}
            onCommit={(nextValue) =>
              updateSheetState((previous) => ({
                ...previous,
                pageHeightInches: nextValue,
              }))
            }
          />

          <SheetNumberField
            id="sheet-rows"
            label="Rows"
            value={sheetState.rows}
            min={MIN_SHEET_ROWS}
            max={MAX_SHEET_ROWS}
            step={1}
            decimals={0}
            onCommit={(nextValue) =>
              updateSheetState((previous) => ({
                ...previous,
                rows: nextValue,
              }))
            }
          />

          <SheetNumberField
            id="sheet-columns"
            label="Columns"
            value={sheetState.columns}
            min={MIN_SHEET_COLUMNS}
            max={MAX_SHEET_COLUMNS}
            step={1}
            decimals={0}
            onCommit={(nextValue) =>
              updateSheetState((previous) => ({
                ...previous,
                columns: nextValue,
              }))
            }
          />

          <SheetNumberField
            id="sheet-margin-x"
            label="Page margin X (in)"
            value={sheetState.marginXInches}
            min={MIN_SHEET_MARGIN_INCHES}
            max={MAX_SHEET_MARGIN_INCHES}
            step={0.01}
            decimals={2}
            onCommit={(nextValue) =>
              updateSheetState((previous) => ({
                ...previous,
                marginXInches: nextValue,
              }))
            }
          />

          <SheetNumberField
            id="sheet-margin-y"
            label="Page margin Y (in)"
            value={sheetState.marginYInches}
            min={MIN_SHEET_MARGIN_INCHES}
            max={MAX_SHEET_MARGIN_INCHES}
            step={0.01}
            decimals={2}
            onCommit={(nextValue) =>
              updateSheetState((previous) => ({
                ...previous,
                marginYInches: nextValue,
              }))
            }
          />

          <SheetNumberField
            id="sheet-padding-x"
            label="Tag padding X (in)"
            value={sheetState.paddingXInches}
            min={MIN_SHEET_PADDING_INCHES}
            max={MAX_SHEET_PADDING_INCHES}
            step={0.01}
            decimals={2}
            onCommit={(nextValue) =>
              updateSheetState((previous) => ({
                ...previous,
                paddingXInches: nextValue,
              }))
            }
          />

          <SheetNumberField
            id="sheet-padding-y"
            label="Tag padding Y (in)"
            value={sheetState.paddingYInches}
            min={MIN_SHEET_PADDING_INCHES}
            max={MAX_SHEET_PADDING_INCHES}
            step={0.01}
            decimals={2}
            onCommit={(nextValue) =>
              updateSheetState((previous) => ({
                ...previous,
                paddingYInches: nextValue,
              }))
            }
          />

          <div className="md:col-span-2">
            <label
              htmlFor="sheet-print-dashed-borders"
              className="flex items-center gap-2 text-sm"
            >
              <input
                id="sheet-print-dashed-borders"
                type="checkbox"
                checked={sheetState.printDashedBorders}
                onChange={(event) =>
                  updateSheetState((previous) => ({
                    ...previous,
                    printDashedBorders: event.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              <span>Print dashed borders</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <Collapsible
              open={isPrintQuantityOpen}
              onOpenChange={setIsPrintQuantityOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span>Print quantity</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isPrintQuantityOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-border bg-muted/20 mt-3 space-y-2 rounded-md border p-3">
                <SheetNumberField
                  id="sheet-copies-per-label"
                  label="Copies of each selected label"
                  value={copiesPerLabel}
                  min={MIN_SHEET_COPIES_PER_LABEL}
                  max={MAX_SHEET_COPIES_PER_LABEL}
                  step={1}
                  decimals={0}
                  onCommit={onCopiesPerLabelChange}
                />
                <p className="text-muted-foreground text-xs">
                  The same label is repeated together before printing the next
                  label.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            Tag size on sheet (fixed to active tag size):{" "}
            {sheetMetrics.slotWidthInches.toFixed(2)}&quot; ×{" "}
            {sheetMetrics.slotHeightInches.toFixed(2)}&quot;
          </p>
          <p className="font-medium">
            {selectedLabelCount} label{selectedLabelCount === 1 ? "" : "s"}{" "}
            selected, {copiesPerLabel} cop{copiesPerLabel === 1 ? "y" : "ies"}{" "}
            of each, {totalLabelCount} total label
            {totalLabelCount === 1 ? "" : "s"}.
          </p>
          <p className="text-muted-foreground">
            {sheetMetrics.tagsPerSheet} tag
            {sheetMetrics.tagsPerSheet === 1 ? "" : "s"} per sheet,{" "}
            {estimatedSheetCount} sheet
            {estimatedSheetCount === 1 ? "" : "s"} needed.
          </p>
          {!sheetMetrics.isValid ? (
            <p className="text-destructive">
              Page too small for this layout. Required:{" "}
              {sheetMetrics.requiredWidthInches.toFixed(2)}&quot; ×{" "}
              {sheetMetrics.requiredHeightInches.toFixed(2)}&quot;.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Sheet Preview</h4>
          {sheetMetrics.isValid && firstSheetPreviewTags.length > 0 ? (
            <>
              <div className="border-border bg-muted/20 overflow-auto rounded-md border p-3">
                <div
                  className="mx-auto"
                  style={{
                    width: `${pageWidthPx * previewScale}px`,
                    height: `${pageHeightPx * previewScale}px`,
                  }}
                >
                  <div
                    className="origin-top-left"
                    style={{
                      width: `${pageWidthPx}px`,
                      height: `${pageHeightPx}px`,
                      transform: `scale(${previewScale})`,
                    }}
                  >
                    <div
                      className="bg-background border-border h-full w-full border"
                      style={{
                        padding: `${marginYPx}px ${marginXPx}px`,
                        display: "grid",
                        gridTemplateColumns: `repeat(${sheetState.columns}, ${slotWidthPx}px)`,
                        gridTemplateRows: `repeat(${sheetState.rows}, ${slotHeightPx}px)`,
                        columnGap: `${paddingXPx}px`,
                        rowGap: `${paddingYPx}px`,
                        alignContent: "start",
                        justifyContent: "start",
                      }}
                    >
                      {firstSheetPreviewTags.map((tag) => (
                        <article
                          key={`sheet-preview-${tag.id}`}
                          className="border-muted-foreground/40 bg-background relative overflow-hidden border border-dashed p-2"
                          style={{
                            width: `${sheetMetrics.slotWidthInches}in`,
                            height: `${sheetMetrics.slotHeightInches}in`,
                          }}
                        >
                          <div
                            style={{
                              paddingRight: tag.qrCodeUrl
                                ? `${QR_RESERVED_RIGHT_INCHES}in`
                                : undefined,
                              paddingBottom: tag.qrCodeUrl
                                ? `${QR_RESERVED_BOTTOM_INCHES}in`
                                : undefined,
                            }}
                          >
                            {tag.rows.map((row) => (
                              <div
                                key={row.id}
                                className="grid items-baseline gap-x-2"
                                style={{
                                  gridTemplateColumns: row.cells
                                    .map((cell) => `${cell.width}fr`)
                                    .join(" "),
                                }}
                              >
                                {row.cells.map((cell) => (
                                  <p
                                    key={cell.id}
                                    className={cn(
                                      "min-w-0 leading-tight",
                                      cell.wrap
                                        ? "break-words whitespace-normal"
                                        : "whitespace-nowrap",
                                      cell.overflow
                                        ? "overflow-visible"
                                        : "overflow-hidden",
                                      cell.bold && "font-semibold",
                                      cell.italic && "italic",
                                      cell.underline && "underline",
                                      cell.textAlign === "center" &&
                                        "text-center",
                                      cell.textAlign === "right" && "text-right",
                                      cell.textAlign === "left" && "text-left",
                                    )}
                                    style={{
                                      fontSize: `${resolveCellFontSizePx(
                                        cell,
                                        row,
                                        sheetMetrics.slotWidthInches,
                                        Boolean(tag.qrCodeUrl),
                                      )}px`,
                                    }}
                                  >
                                    {cell.text}
                                  </p>
                                ))}
                              </div>
                            ))}
                          </div>

                          {tag.qrCodeUrl ? (
                            <QrCodeSvg
                              qrCodeUrl={tag.qrCodeUrl}
                              className="absolute bg-white [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
                              style={{
                                right: `${QR_OFFSET_INCHES}in`,
                                bottom: `${QR_OFFSET_INCHES}in`,
                                width: `${QR_SIZE_INCHES}in`,
                                height: `${QR_SIZE_INCHES}in`,
                              }}
                            />
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {estimatedSheetCount > 1 ? (
                <p className="text-muted-foreground text-xs">
                  Preview shows the first sheet only.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              {selectedLabelCount === 0
                ? "Select listings below to preview sheet output."
                : "Adjust settings so the selected page can fit the tag grid."}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={onResetToSingleTag}>
            Reset to 1 Tag
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={!canExport || isPreparingDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                {isPreparingDownload ? "Preparing..." : "Download"}
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onSelect={() => onDownloadSheetPages()}
                disabled={isPreparingDownload}
              >
                <FileDown className="h-4 w-4" />
                HTML Sheets (.html)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDownloadSheetPdf()}
                disabled={isPreparingDownload}
              >
                <FileText className="h-4 w-4" />
                PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDownloadSheetImages()}
                disabled={isPreparingDownload}
              >
                <FileImage className="h-4 w-4" />
                Images (.zip)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            onClick={onPrintSheets}
            disabled={!canExport}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Sheets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TagTemplatePickerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplateLabel: string;
  selectedTemplateId: string;
  builtinTemplates: ResolvedTagLayoutTemplate[];
  userTemplates: StoredTagLayoutTemplate[];
  onApplyTemplate: (templateId: string) => void;
  onDeleteTemplateMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDeleteTemplateClick: (
    event: React.MouseEvent<HTMLButtonElement>,
    templateId: string,
    templateName: string,
  ) => void;
}

function TagTemplatePicker({
  isOpen,
  onOpenChange,
  selectedTemplateLabel,
  selectedTemplateId,
  builtinTemplates,
  userTemplates,
  onApplyTemplate,
  onDeleteTemplateMouseDown,
  onDeleteTemplateClick,
}: TagTemplatePickerProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="template-picker">Templates</Label>
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="template-picker"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="h-9 w-full justify-between"
          >
            <span className="truncate">{selectedTemplateLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandList>
              <CommandGroup heading="Built-in">
                {builtinTemplates.map((template) => (
                  <CommandItem
                    key={template.id}
                    onSelect={() => onApplyTemplate(template.id)}
                    className="px-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        template.id === selectedTemplateId
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span className="truncate">{template.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              {userTemplates.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Saved">
                    {userTemplates.map((template) => (
                      <CommandItem
                        key={template.id}
                        onSelect={() => onApplyTemplate(template.id)}
                        className="px-2"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            template.id === selectedTemplateId
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate">{template.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive h-6 w-6 shrink-0"
                            onMouseDown={onDeleteTemplateMouseDown}
                            onClick={(event) =>
                              onDeleteTemplateClick(
                                event,
                                template.id,
                                template.name,
                              )
                            }
                            aria-label={`Delete template ${template.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => onApplyTemplate(TEMPLATE_IMPORT_ID)}
                  className="px-2"
                >
                  Import shared template...
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface TagDesignerCustomSizeInputsProps {
  customWidthInches: number;
  customHeightInches: number;
  updateState: UpdateTagDesignerState;
}

function TagDesignerCustomSizeInputs({
  customWidthInches,
  customHeightInches,
  updateState,
}: TagDesignerCustomSizeInputsProps) {
  const commitWidthDraft = React.useCallback(
    (inputElement: HTMLInputElement) => {
      const parsedValue = parseSheetNumberInput(inputElement.value.trim(), 2);
      if (parsedValue === null) {
        inputElement.value = formatSheetNumberForInput(customWidthInches, 2);
        return;
      }

      const normalizedValue = normalizeSheetNumber(
        parsedValue,
        MIN_TAG_WIDTH_INCHES,
        MAX_TAG_WIDTH_INCHES,
        2,
      );
      updateState((previous) => ({
        ...previous,
        customWidthInches: normalizedValue,
      }));
      inputElement.value = formatSheetNumberForInput(normalizedValue, 2);
    },
    [customWidthInches, updateState],
  );

  const commitHeightDraft = React.useCallback(
    (inputElement: HTMLInputElement) => {
      const parsedValue = parseSheetNumberInput(inputElement.value.trim(), 2);
      if (parsedValue === null) {
        inputElement.value = formatSheetNumberForInput(customHeightInches, 2);
        return;
      }

      const normalizedValue = normalizeSheetNumber(
        parsedValue,
        MIN_TAG_HEIGHT_INCHES,
        MAX_TAG_HEIGHT_INCHES,
        2,
      );
      updateState((previous) => ({
        ...previous,
        customHeightInches: normalizedValue,
      }));
      inputElement.value = formatSheetNumberForInput(normalizedValue, 2);
    },
    [customHeightInches, updateState],
  );

  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="custom-width-input">Width (in)</Label>
        <Input
          key={`custom-width-${customWidthInches}`}
          id="custom-width-input"
          type="number"
          min={MIN_TAG_WIDTH_INCHES}
          max={MAX_TAG_WIDTH_INCHES}
          step={0.01}
          inputMode="decimal"
          defaultValue={formatSheetNumberForInput(customWidthInches, 2)}
          onBlur={(event) => commitWidthDraft(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.currentTarget.value = formatSheetNumberForInput(
                customWidthInches,
                2,
              );
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="custom-height-input">Height (in)</Label>
        <Input
          key={`custom-height-${customHeightInches}`}
          id="custom-height-input"
          type="number"
          min={MIN_TAG_HEIGHT_INCHES}
          max={MAX_TAG_HEIGHT_INCHES}
          step={0.01}
          inputMode="decimal"
          defaultValue={formatSheetNumberForInput(customHeightInches, 2)}
          onBlur={(event) => commitHeightDraft(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.currentTarget.value = formatSheetNumberForInput(
                customHeightInches,
                2,
              );
              event.currentTarget.blur();
            }
          }}
        />
      </div>
    </>
  );
}

interface TagDesignerControlsProps {
  state: TagDesignerState;
  updateState: UpdateTagDesignerState;
  widthInches: number;
  heightInches: number;
  templatePickerProps: TagTemplatePickerProps;
}

function TagDesignerControls({
  state,
  updateState,
  widthInches,
  heightInches,
  templatePickerProps,
}: TagDesignerControlsProps) {
  return (
    <div className="border-border grid gap-3 rounded-md border p-3 md:grid-cols-[260px_260px_1fr]">
      <div className="space-y-2">
        <Label htmlFor="tag-size-select">Tag Size</Label>
        <select
          id="tag-size-select"
          className="border-border bg-background h-9 w-full rounded-md border px-2 text-sm"
          value={state.sizePresetId}
          onChange={(e) =>
            updateState((prev) => ({
              ...prev,
              sizePresetId: e.target.value,
            }))
          }
        >
          {TAG_SIZE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <TagTemplatePicker {...templatePickerProps} />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-end">
        <label className="flex items-center gap-2 text-sm">
          <input
            id="layout-qr-toggle"
            type="checkbox"
            checked={state.showQrCode}
            onChange={(e) =>
              updateState((prev) => ({
                ...prev,
                showQrCode: e.target.checked,
              }))
            }
            className="h-4 w-4"
          />
          <span>QR code</span>
        </label>

        {state.sizePresetId === "custom" ? (
          <TagDesignerCustomSizeInputs
            customWidthInches={state.customWidthInches}
            customHeightInches={state.customHeightInches}
            updateState={updateState}
          />
        ) : null}

        <p className="text-muted-foreground text-xs">
          Active: {widthInches.toFixed(2)}&quot; × {heightInches.toFixed(2)}
          &quot;
        </p>
      </div>
    </div>
  );
}

interface TagDesignerLayoutProps {
  rows: TagRow[];
  matchedTemplateName: string;
  isCustomLayout: boolean;
  onSaveTemplate: () => void;
  onShareTemplate: () => Promise<void>;
  onResetLayout: () => void;
  onAddRow: () => void;
  onMoveRow: (rowIndex: number, direction: -1 | 1) => void;
  onRemoveRow: (rowIndex: number) => void;
  onAddCellToRow: (rowIndex: number) => void;
  onMoveCell: (rowIndex: number, cellIndex: number, direction: -1 | 1) => void;
  onUpdateRowCell: (rowIndex: number, cellIndex: number, cell: TagCell) => void;
  onRemoveRowCell: (rowIndex: number, cellIndex: number) => void;
}

function TagDesignerLayout({
  rows,
  matchedTemplateName,
  isCustomLayout,
  onSaveTemplate,
  onShareTemplate,
  onResetLayout,
  onAddRow,
  onMoveRow,
  onRemoveRow,
  onAddCellToRow,
  onMoveCell,
  onUpdateRowCell,
  onRemoveRowCell,
}: TagDesignerLayoutProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Layout{" "}
          <span className="text-muted-foreground font-normal">
            {matchedTemplateName}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {isCustomLayout ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSaveTemplate}
            >
              Save as template
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void onShareTemplate();
            }}
            title="Copy layout template JSON"
          >
            <Share2 className="mr-1 h-3 w-3" />
            Share
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetLayout}
            title="Reset to default layout"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onAddRow}>
            <Plus className="mr-1 h-3 w-3" />
            Add Row
          </Button>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto px-3 pb-1">
          <div
            className={cn(
              CELL_GRID,
              "text-muted-foreground min-w-[640px] text-[10px]",
            )}
          >
            <span />
            <span>Field</span>
            <span>Label</span>
            <span>Width</span>
            <span>Align</span>
            <span>Size</span>
            <span>Fit</span>
            <span>Style</span>
            <span />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {rows.map((row, rowIndex) => (
          <div
            key={row.id}
            className="border-border space-y-1.5 rounded-md border px-3 py-2"
          >
            <div className="flex items-center justify-start gap-3">
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 px-0"
                  disabled={rowIndex === 0}
                  onClick={() => onMoveRow(rowIndex, -1)}
                  title="Move row up"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 px-0"
                  disabled={rowIndex === rows.length - 1}
                  onClick={() => onMoveRow(rowIndex, 1)}
                  title="Move row down"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive h-6 w-6 px-0"
                  onClick={() => onRemoveRow(rowIndex)}
                  title="Remove row"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-muted-foreground text-xs font-medium">
                Row {rowIndex + 1}
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[640px] space-y-1">
                {row.cells.map((cell, cellIndex) => (
                  <TagCellEditor
                    key={`${row.id}-${cellIndex}`}
                    cell={cell}
                    isFirst={cellIndex === 0}
                    isLast={cellIndex === row.cells.length - 1}
                    onUpdate={(updated) =>
                      onUpdateRowCell(rowIndex, cellIndex, updated)
                    }
                    onRemove={() => onRemoveRowCell(rowIndex, cellIndex)}
                    onMoveUp={() => onMoveCell(rowIndex, cellIndex, -1)}
                    onMoveDown={() => onMoveCell(rowIndex, cellIndex, 1)}
                  />
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onAddCellToRow(rowIndex)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Cell
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TagDesignerPreviewProps {
  listingsCount: number;
  previewTags: TagPreviewData[];
  visiblePreviewTags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
}

function TagDesignerPreview({
  listingsCount,
  previewTags,
  visiblePreviewTags,
  widthInches,
  heightInches,
}: TagDesignerPreviewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Preview</h3>
        <div className="flex items-center gap-2">
          {listingsCount === 0 ? (
            <p className="text-muted-foreground text-xs">
              Sample preview — select listings below
            </p>
          ) : null}
          {listingsCount > 0 &&
          previewTags.length > visiblePreviewTags.length ? (
            <p className="text-muted-foreground text-xs">
              Showing first {visiblePreviewTags.length} of {previewTags.length}{" "}
              tags
            </p>
          ) : null}
        </div>
      </div>

      {visiblePreviewTags.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {visiblePreviewTags.map((tag) => (
            <article
              key={tag.id}
              className="border-border bg-background relative overflow-hidden rounded-md border border-dashed p-2"
              style={{
                width: `${widthInches}in`,
                height: `${heightInches}in`,
              }}
            >
              <div
                style={{
                  paddingRight: tag.qrCodeUrl
                    ? `${QR_RESERVED_RIGHT_INCHES}in`
                    : undefined,
                  paddingBottom: tag.qrCodeUrl
                    ? `${QR_RESERVED_BOTTOM_INCHES}in`
                    : undefined,
                }}
              >
                {tag.rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid items-baseline gap-x-2"
                    style={{
                      gridTemplateColumns: row.cells.map((c) => `${c.width}fr`).join(" "),
                    }}
                  >
                    {row.cells.map((cell) => (
                      <p
                        key={cell.id}
                        className={cn(
                          "min-w-0 leading-tight",
                          cell.wrap
                            ? "break-words whitespace-normal"
                            : "whitespace-nowrap",
                          cell.overflow ? "overflow-visible" : "overflow-hidden",
                          cell.bold && "font-semibold",
                          cell.italic && "italic",
                          cell.underline && "underline",
                          cell.textAlign === "center" && "text-center",
                          cell.textAlign === "right" && "text-right",
                          cell.textAlign === "left" && "text-left",
                        )}
                        style={{
                          fontSize: `${resolveCellFontSizePx(
                            cell,
                            row,
                            widthInches,
                            Boolean(tag.qrCodeUrl),
                          )}px`,
                        }}
                      >
                        {cell.text}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {tag.qrCodeUrl ? (
                <QrCodeSvg
                  qrCodeUrl={tag.qrCodeUrl}
                  className="absolute bg-white [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
                  style={{
                    right: `${QR_OFFSET_INCHES}in`,
                    bottom: `${QR_OFFSET_INCHES}in`,
                    width: `${QR_SIZE_INCHES}in`,
                    height: `${QR_SIZE_INCHES}in`,
                  }}
                />
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Select listings from the table below to preview and print tags.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main designer panel
// ---------------------------------------------------------------------------

export function TagDesignerPanel({ listings }: { listings: TagListingData[] }) {
  const [isPreparingDownload, setIsPreparingDownload] = React.useState(false);
  const [isSheetCreatorOpen, setIsSheetCreatorOpen] = React.useState(false);
  const [sheetCopiesPerLabel, setSheetCopiesPerLabel] = React.useState(
    MIN_SHEET_COPIES_PER_LABEL,
  );
  const [storedState, setStoredState] = useLocalStorage<TagDesignerState>(
    TAG_DESIGNER_STORAGE_KEY,
    DEFAULT_TAG_DESIGNER_STATE,
  );
  const [storedUserTemplates, setStoredUserTemplates] = useLocalStorage<
    StoredTagLayoutTemplate[]
  >(
    TAG_TEMPLATE_LIBRARY_STORAGE_KEY,
    [],
  );
  const [storedSheetState, setStoredSheetState] =
    useLocalStorage<TagSheetCreatorState>(
      TAG_SHEET_CREATOR_STORAGE_KEY,
      createDefaultSheetCreatorState({
        tagWidthInches: DEFAULT_TAG_DESIGNER_STATE.customWidthInches,
        tagHeightInches: DEFAULT_TAG_DESIGNER_STATE.customHeightInches,
      }),
    );
  const baseUrl = React.useMemo(() => getBaseUrl(), []);

  const state = React.useMemo(
    () => sanitizeTagDesignerState(storedState),
    [storedState],
  );

  const updateState = React.useCallback(
    (updater: (previous: TagDesignerState) => TagDesignerState) => {
      setStoredState((previous) => {
        const normalized = sanitizeTagDesignerState(previous);
        return sanitizeTagDesignerState(updater(normalized));
      });
    },
    [setStoredState],
  );

  const userTemplates = React.useMemo(() => {
    if (!Array.isArray(storedUserTemplates)) return [];
    return storedUserTemplates
      .map((template) => sanitizeStoredTemplate(template))
      .filter((template): template is StoredTagLayoutTemplate => template !== null);
  }, [storedUserTemplates]);

  const builtinTemplates = React.useMemo<ResolvedTagLayoutTemplate[]>(
    () =>
      BUILTIN_TAG_LAYOUT_TEMPLATES.map((template) => ({
        ...template,
        layout: sanitizeTagDesignerState(template.layout),
        isBuiltin: true,
        signature: createLayoutSignature(template.layout),
      })),
    [],
  );

  const allTemplates = React.useMemo<ResolvedTagLayoutTemplate[]>(
    () => [
      ...builtinTemplates,
      ...userTemplates.map((template) => ({
        ...template,
        isBuiltin: false,
        signature: createLayoutSignature(template.layout),
      })),
    ],
    [builtinTemplates, userTemplates],
  );

  const matchedTemplate = React.useMemo(() => {
    const signature = createLayoutSignature(state);
    return allTemplates.find((template) => template.signature === signature) ?? null;
  }, [allTemplates, state]);

  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = React.useState(false);
  const matchedTemplateName = matchedTemplate?.name ?? "custom";
  const isCustomLayout = matchedTemplate === null;

  const handleShareTemplate = React.useCallback(async () => {
    const templatePayload = JSON.stringify({
      version: 1,
      layout: sanitizeTagDesignerState(state),
    });

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.writeText === "function"
      ) {
        await navigator.clipboard.writeText(templatePayload);
        toast.success("Layout template copied as JSON.");
        return;
      }
    } catch (error) {
      console.error("Failed to copy layout template to clipboard", error);
    }

    window.prompt("Copy template JSON", templatePayload);
  }, [state]);

  const handleImportTemplate = React.useCallback(() => {
    const input = window.prompt("Paste shared template JSON");
    if (input === null) return;

    const trimmed = input.trim();
    if (trimmed.length === 0) {
      toast.error("Template JSON is empty.");
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      let candidate = parsed;

      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        if ("layout" in record) {
          candidate = record.layout;
        } else if ("state" in record) {
          candidate = record.state;
        }
      }

      if (!candidate || typeof candidate !== "object") {
        throw new Error("Template must be an object.");
      }

      if (!Array.isArray((candidate as Record<string, unknown>).rows)) {
        throw new Error("Template must include rows.");
      }

      setStoredState(sanitizeTagDesignerState(candidate as TagDesignerState));
      toast.success("Template imported.");
    } catch (error) {
      console.error("Failed to import template JSON", error);
      toast.error("Invalid template JSON.");
    }
  }, [setStoredState]);

  const handleTemplateSelectChange = React.useCallback(
    (nextTemplateId: string) => {
      if (nextTemplateId === TEMPLATE_IMPORT_ID) {
        handleImportTemplate();
        return;
      }

      if (nextTemplateId === TEMPLATE_CUSTOM_ID) return;

      const template = allTemplates.find(
        (candidate) => candidate.id === nextTemplateId,
      );
      if (!template) return;

      setStoredState(sanitizeTagDesignerState(template.layout));
      toast.success(`Applied template: ${template.name}.`);
    },
    [allTemplates, handleImportTemplate, setStoredState],
  );

  const handleSaveTemplate = React.useCallback(() => {
    const suggestedName =
      matchedTemplate && !matchedTemplate.isBuiltin ? matchedTemplate.name : "";
    const inputName = window.prompt(
      "Template name",
      suggestedName || "My template",
    );
    if (inputName === null) return;

    const name = inputName.trim();
    if (!name) {
      toast.error("Template name is required.");
      return;
    }

    const existingByName =
      userTemplates.find(
        (template) => template.name.toLowerCase() === name.toLowerCase(),
      ) ??
      (matchedTemplate && !matchedTemplate.isBuiltin ? matchedTemplate : null);
    const templateId =
      existingByName?.id ?? `user-template-${Date.now().toString(36)}`;
    const layout = sanitizeTagDesignerState(state);

    setStoredUserTemplates((previous) => {
      const sanitizedPrevious = (Array.isArray(previous) ? previous : [])
        .map((template) => sanitizeStoredTemplate(template))
        .filter(
          (template): template is StoredTagLayoutTemplate => template !== null,
        );

      if (existingByName) {
        return sanitizedPrevious.map((template) =>
          template.id === existingByName.id
            ? { ...template, name, layout }
            : template,
        );
      }

      return [...sanitizedPrevious, { id: templateId, name, layout }];
    });

    toast.success(existingByName ? "Template updated." : "Template saved.");
  }, [matchedTemplate, setStoredUserTemplates, state, userTemplates]);

  const handleDeleteTemplate = React.useCallback(
    (templateId: string, templateName: string) => {
      const shouldDelete = window.confirm(`Delete template "${templateName}"?`);
      if (!shouldDelete) return;

      setStoredUserTemplates((previous) =>
        (Array.isArray(previous) ? previous : [])
          .map((template) => sanitizeStoredTemplate(template))
          .filter(
            (template): template is StoredTagLayoutTemplate =>
              template !== null && template.id !== templateId,
          ),
      );
      toast.success("Template deleted.");
    },
    [setStoredUserTemplates],
  );

  const handleTemplateRowDeleteClick = React.useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      templateId: string,
      templateName: string,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      handleDeleteTemplate(templateId, templateName);
    },
    [handleDeleteTemplate],
  );

  const handleTemplateRowDeleteMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  const applyTemplateFromPicker = React.useCallback(
    (templateId: string) => {
      setIsTemplatePickerOpen(false);
      handleTemplateSelectChange(templateId);
    },
    [handleTemplateSelectChange],
  );

  const selectedTemplateId = matchedTemplate?.id ?? TEMPLATE_CUSTOM_ID;

  const selectedTemplateLabel = matchedTemplate?.name ?? "Custom";

  const activeSizePreset =
    TAG_SIZE_PRESETS.find((p) => p.id === state.sizePresetId) ??
    TAG_SIZE_PRESETS[0]!;
  const widthInches =
    activeSizePreset.id === "custom"
      ? state.customWidthInches
      : activeSizePreset.widthInches;
  const heightInches =
    activeSizePreset.id === "custom"
      ? state.customHeightInches
      : activeSizePreset.heightInches;

  const sheetState = React.useMemo(
    () =>
      sanitizeTagSheetCreatorState(storedSheetState, {
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      }),
    [heightInches, storedSheetState, widthInches],
  );

  const updateSheetState = React.useCallback(
    (updater: (previous: TagSheetCreatorState) => TagSheetCreatorState) => {
      setStoredSheetState((previous) => {
        const normalized = sanitizeTagSheetCreatorState(previous, {
          tagWidthInches: widthInches,
          tagHeightInches: heightInches,
        });
        return sanitizeTagSheetCreatorState(updater(normalized), {
          tagWidthInches: widthInches,
          tagHeightInches: heightInches,
        });
      });
    },
    [heightInches, setStoredSheetState, widthInches],
  );

  const sheetMetrics = React.useMemo(
    () =>
      resolveSheetMetrics(sheetState, {
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      }),
    [heightInches, sheetState, widthInches],
  );

  const basePreviewTags = React.useMemo<TagPreviewData[]>(() => {
    const toPreview = listings.length > 0 ? listings : [PLACEHOLDER_LISTING];
    return toPreview.map((listing) => ({
      id: listing.id,
      rows: buildResolvedRowsForListing(listing, state.rows),
      qrCodeUrl:
        state.showQrCode && listing.userId
          ? buildPublicListingUrl(baseUrl, listing.userId, listing.id)
          : null,
    }));
  }, [baseUrl, listings, state.rows, state.showQrCode]);

  const sheetPreviewTags = React.useMemo(
    () =>
      duplicateTagsForSheetLabels(
        listings.length > 0 ? basePreviewTags : [],
        sheetCopiesPerLabel,
      ),
    [basePreviewTags, listings.length, sheetCopiesPerLabel],
  );

  const visiblePreviewTags = basePreviewTags.slice(0, 8);

  // -- Row mutations --

  const updateRow = React.useCallback(
    (rowIndex: number, updater: (row: TagRow) => TagRow) => {
      updateState((prev) => ({
        ...prev,
        rows: prev.rows.map((r, i) => (i === rowIndex ? updater(r) : r)),
      }));
    },
    [updateState],
  );

  const addRow = () => {
    updateState((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        { id: generateRowId(), cells: [createDefaultCell(prev.rows)] },
      ],
    }));
  };

  const removeRow = (index: number) => {
    updateState((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index),
    }));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    updateState((prev) => {
      const next = index + direction;
      if (next < 0 || next >= prev.rows.length) return prev;
      const rows = [...prev.rows];
      const tmp = rows[index]!;
      rows[index] = rows[next]!;
      rows[next] = tmp;
      return { ...prev, rows };
    });
  };

  const addCellToRow = (rowIndex: number) => {
    updateState((prev) => ({
      ...prev,
      rows: prev.rows.map((r, i) =>
        i === rowIndex
          ? { ...r, cells: [...r.cells, createDefaultCell(prev.rows)] }
          : r,
      ),
    }));
  };

  const moveCell = (rowIndex: number, cellIndex: number, direction: -1 | 1) => {
    updateState((prev) => {
      const row = prev.rows[rowIndex];
      if (!row) return prev;
      const nextIndex = cellIndex + direction;
      if (nextIndex < 0 || nextIndex >= row.cells.length) return prev;
      const cells = [...row.cells];
      const tmp = cells[cellIndex]!;
      cells[cellIndex] = cells[nextIndex]!;
      cells[nextIndex] = tmp;
      return {
        ...prev,
        rows: prev.rows.map((r, i) => (i === rowIndex ? { ...r, cells } : r)),
      };
    });
  };

  const updateRowCell = React.useCallback(
    (rowIndex: number, cellIndex: number, updatedCell: TagCell) => {
      updateRow(rowIndex, (row) => ({
        ...row,
        cells: row.cells.map((cell, index) =>
          index === cellIndex ? updatedCell : cell,
        ),
      }));
    },
    [updateRow],
  );

  const removeRowCell = React.useCallback(
    (rowIndex: number, cellIndex: number) => {
      updateRow(rowIndex, (row) => ({
        ...row,
        cells: row.cells.filter((_, index) => index !== cellIndex),
      }));
    },
    [updateRow],
  );

  const resetLayout = React.useCallback(() => {
    setStoredState(DEFAULT_TAG_DESIGNER_STATE);
  }, [setStoredState]);

  const handleOpenSheetCreator = React.useCallback(() => {
    setSheetCopiesPerLabel(MIN_SHEET_COPIES_PER_LABEL);
    if (typeof window !== "undefined") {
      const existingSheetState = window.localStorage.getItem(
        TAG_SHEET_CREATOR_STORAGE_KEY,
      );
      if (!existingSheetState) {
        setStoredSheetState(
          createDefaultSheetCreatorState({
            tagWidthInches: widthInches,
            tagHeightInches: heightInches,
          }),
        );
      }
    }
    setIsSheetCreatorOpen(true);
  }, [heightInches, setStoredSheetState, widthInches]);

  const handleSheetCopiesPerLabelChange = React.useCallback(
    (nextCopiesPerLabel: number) => {
      setSheetCopiesPerLabel(
        Math.min(
          MAX_SHEET_COPIES_PER_LABEL,
          Math.max(
            MIN_SHEET_COPIES_PER_LABEL,
            Math.floor(nextCopiesPerLabel),
          ),
        ),
      );
    },
    [],
  );

  const handleResetSheetToSingleTag = React.useCallback(() => {
    setStoredSheetState(
      createDefaultSheetCreatorState({
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      }),
    );
  }, [heightInches, setStoredSheetState, widthInches]);

  const createSheetHtml = React.useCallback(() => {
    if (!listings.length) {
      toast.error("Select at least one listing in the table before printing.");
      return null;
    }
    if (!sheetMetrics.isValid) {
      toast.error("Adjust sheet settings so the tag grid fits the page.");
      return null;
    }

    return createTagSheetDocumentHtml({
      tags: sheetPreviewTags,
      sheetState,
      tagWidthInches: widthInches,
      tagHeightInches: heightInches,
    });
  }, [
    heightInches,
    listings.length,
    sheetPreviewTags,
    sheetMetrics.isValid,
    sheetState,
    widthInches,
  ]);

  const isSheetExportReady = React.useCallback(() => {
    if (!listings.length) {
      toast.error("Select at least one listing in the table before downloading.");
      return false;
    }
    if (!sheetMetrics.isValid) {
      toast.error("Adjust sheet settings so the tag grid fits the page.");
      return false;
    }
    return true;
  }, [listings.length, sheetMetrics.isValid]);

  const handlePrint = () => {
    if (!listings.length) {
      toast.error("Select at least one listing in the table before printing.");
      return;
    }

    const html = createTagPrintDocumentHtml({
      tags: basePreviewTags,
      widthInches,
      heightInches,
    });

    printTagDocument(html);
  };

  const handleDownloadSheetPages = React.useCallback(() => {
    if (isPreparingDownload) return;
    const html = createSheetHtml();
    if (!html) return;

    downloadTagDocumentHtml(html, buildTagSheetsHtmlFilename());
    toast.success("Sheet pages download started.");
  }, [createSheetHtml, isPreparingDownload]);

  const handleDownloadSheetPdf = React.useCallback(async () => {
    if (isPreparingDownload) return;
    if (!isSheetExportReady()) return;

    setIsPreparingDownload(true);
    try {
      const didDownload = await downloadTagSheetsPdf({
        tags: sheetPreviewTags,
        sheetState,
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      });
      if (didDownload) {
        toast.success("Sheet PDF download started.");
      }
    } finally {
      setIsPreparingDownload(false);
    }
  }, [
    heightInches,
    isPreparingDownload,
    isSheetExportReady,
    sheetPreviewTags,
    sheetState,
    widthInches,
  ]);

  const handleDownloadSheetImages = React.useCallback(async () => {
    if (isPreparingDownload) return;
    if (!isSheetExportReady()) return;

    setIsPreparingDownload(true);
    try {
      const didDownload = await downloadTagSheetImagesZip({
        tags: sheetPreviewTags,
        sheetState,
        tagWidthInches: widthInches,
        tagHeightInches: heightInches,
      });
      if (didDownload) {
        toast.success("Sheet images download started.");
      }
    } finally {
      setIsPreparingDownload(false);
    }
  }, [
    heightInches,
    isPreparingDownload,
    isSheetExportReady,
    sheetPreviewTags,
    sheetState,
    widthInches,
  ]);

  const handlePrintSheets = React.useCallback(() => {
    if (!isSheetExportReady()) return;
    const html = createSheetHtml();
    if (!html) return;

    printTagDocument(html);
  }, [createSheetHtml, isSheetExportReady]);

  const handleDownloadPages = React.useCallback(() => {
    if (isPreparingDownload) return;
    if (!listings.length) {
      toast.error("Select at least one listing in the table before downloading.");
      return;
    }

    const html = createTagPrintDocumentHtml({
      tags: basePreviewTags,
      widthInches,
      heightInches,
    });
    downloadTagDocumentHtml(html);
    toast.success("Pages download started.");
  }, [
    basePreviewTags,
    heightInches,
    isPreparingDownload,
    listings.length,
    widthInches,
  ]);

  const handleDownloadPdf = React.useCallback(async () => {
    if (isPreparingDownload) return;
    if (!listings.length) {
      toast.error("Select at least one listing in the table before downloading.");
      return;
    }

    setIsPreparingDownload(true);
    try {
      const didDownload = await downloadTagDocumentPdf({
        tags: basePreviewTags,
        widthInches,
        heightInches,
      });
      if (didDownload) {
        toast.success("PDF download started.");
      }
    } finally {
      setIsPreparingDownload(false);
    }
  }, [
    heightInches,
    isPreparingDownload,
    listings.length,
    basePreviewTags,
    widthInches,
  ]);

  const handleDownloadImages = React.useCallback(async () => {
    if (isPreparingDownload) return;
    if (!listings.length) {
      toast.error("Select at least one listing in the table before downloading.");
      return;
    }

    setIsPreparingDownload(true);
    try {
      const didDownload = await downloadTagImagesZip({
        tags: basePreviewTags,
        widthInches,
        heightInches,
      });
      if (didDownload) {
        toast.success("Images download started.");
      }
    } finally {
      setIsPreparingDownload(false);
    }
  }, [
    heightInches,
    isPreparingDownload,
    listings.length,
    basePreviewTags,
    widthInches,
  ]);

  return (
    <section className="border-border bg-card mx-auto max-w-5xl space-y-4 rounded-lg border p-4">
      <TagDesignerHeader
        selectedListingCount={listings.length}
        onDownloadCsv={() => downloadSelectedListingsCsv(listings, state.rows)}
        onDownloadPages={handleDownloadPages}
        onDownloadPdf={() => void handleDownloadPdf()}
        onDownloadImages={() => void handleDownloadImages()}
        onOpenSheetCreator={handleOpenSheetCreator}
        onPrint={handlePrint}
        isPreparingDownload={isPreparingDownload}
      />

      <TagSheetCreatorDialog
        open={isSheetCreatorOpen}
        onOpenChange={setIsSheetCreatorOpen}
        selectedLabelCount={listings.length}
        copiesPerLabel={sheetCopiesPerLabel}
        onCopiesPerLabelChange={handleSheetCopiesPerLabelChange}
        previewTags={sheetPreviewTags}
        sheetState={sheetState}
        sheetMetrics={sheetMetrics}
        updateSheetState={updateSheetState}
        onDownloadSheetPages={handleDownloadSheetPages}
        onDownloadSheetPdf={() => void handleDownloadSheetPdf()}
        onDownloadSheetImages={() => void handleDownloadSheetImages()}
        onPrintSheets={handlePrintSheets}
        onResetToSingleTag={handleResetSheetToSingleTag}
        isPreparingDownload={isPreparingDownload}
      />

      <TagDesignerControls
        state={state}
        updateState={updateState}
        widthInches={widthInches}
        heightInches={heightInches}
        templatePickerProps={{
          isOpen: isTemplatePickerOpen,
          onOpenChange: setIsTemplatePickerOpen,
          selectedTemplateLabel,
          selectedTemplateId,
          builtinTemplates,
          userTemplates,
          onApplyTemplate: applyTemplateFromPicker,
          onDeleteTemplateMouseDown: handleTemplateRowDeleteMouseDown,
          onDeleteTemplateClick: handleTemplateRowDeleteClick,
        }}
      />

      <TagDesignerLayout
        rows={state.rows}
        matchedTemplateName={matchedTemplateName}
        isCustomLayout={isCustomLayout}
        onSaveTemplate={handleSaveTemplate}
        onShareTemplate={handleShareTemplate}
        onResetLayout={resetLayout}
        onAddRow={addRow}
        onMoveRow={moveRow}
        onRemoveRow={removeRow}
        onAddCellToRow={addCellToRow}
        onMoveCell={moveCell}
        onUpdateRowCell={updateRowCell}
        onRemoveRowCell={removeRowCell}
      />

      <TagDesignerPreview
        listingsCount={listings.length}
        previewTags={basePreviewTags}
        visiblePreviewTags={visiblePreviewTags}
        widthInches={widthInches}
        heightInches={heightInches}
      />
    </section>
  );
}
