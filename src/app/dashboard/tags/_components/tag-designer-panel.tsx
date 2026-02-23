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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
const TEMPLATE_DEFAULT_ID = "default-template";
const TEMPLATE_CUSTOM_ID = "custom-template";
const TEMPLATE_IMPORT_ID = "import-template";
const TEMPLATE_NAME_QR_ID = "template-name-qr";
const TEMPLATE_FULL_DETAIL_ID = "template-full-detail";

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

function parseInches(
  input: string,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseFloat(input);
  if (!Number.isFinite(parsed)) return fallback;
  return Number.parseFloat(clamp(parsed, min, max).toFixed(2));
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

function downloadTagDocumentHtml(html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  triggerBlobDownload(blob, buildTagsHtmlFilename());
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
        type="number"
        min={1}
        max={12}
        value={cell.width}
        onChange={(e) =>
          patch({
            width: clamp(Number.parseInt(e.target.value, 10) || 1, 1, 12),
          })
        }
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
        type="number"
        min={6}
        max={28}
        value={cell.fontSize}
        onChange={(e) =>
          patch({
            fontSize: clamp(Number.parseInt(e.target.value, 10) || 10, 6, 28),
          })
        }
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
  onPrint: () => void;
  isPreparingDownload: boolean;
}

function TagDesignerHeader({
  selectedListingCount,
  onDownloadCsv,
  onDownloadPages,
  onDownloadPdf,
  onDownloadImages,
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
        <Button onClick={onPrint} disabled={!hasListings}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
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
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="custom-width-input">Width (in)</Label>
        <Input
          id="custom-width-input"
          inputMode="decimal"
          value={customWidthInches.toFixed(2)}
          onChange={(e) =>
            updateState((prev) => ({
              ...prev,
              customWidthInches: parseInches(
                e.target.value,
                prev.customWidthInches,
                MIN_TAG_WIDTH_INCHES,
                MAX_TAG_WIDTH_INCHES,
              ),
            }))
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="custom-height-input">Height (in)</Label>
        <Input
          id="custom-height-input"
          inputMode="decimal"
          value={customHeightInches.toFixed(2)}
          onChange={(e) =>
            updateState((prev) => ({
              ...prev,
              customHeightInches: parseInches(
                e.target.value,
                prev.customHeightInches,
                MIN_TAG_HEIGHT_INCHES,
                MAX_TAG_HEIGHT_INCHES,
              ),
            }))
          }
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

  const previewTags = React.useMemo<TagPreviewData[]>(() => {
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

  const visiblePreviewTags = previewTags.slice(0, 8);

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

  const handlePrint = () => {
    if (!listings.length) {
      toast.error("Select at least one listing in the table before printing.");
      return;
    }

    const html = createTagPrintDocumentHtml({
      tags: previewTags,
      widthInches,
      heightInches,
    });

    printTagDocument(html);
  };

  const handleDownloadPages = React.useCallback(() => {
    if (isPreparingDownload) return;
    if (!listings.length) {
      toast.error("Select at least one listing in the table before downloading.");
      return;
    }

    const html = createTagPrintDocumentHtml({
      tags: previewTags,
      widthInches,
      heightInches,
    });
    downloadTagDocumentHtml(html);
    toast.success("Pages download started.");
  }, [heightInches, isPreparingDownload, listings.length, previewTags, widthInches]);

  const handleDownloadPdf = React.useCallback(async () => {
    if (isPreparingDownload) return;
    if (!listings.length) {
      toast.error("Select at least one listing in the table before downloading.");
      return;
    }

    setIsPreparingDownload(true);
    try {
      const didDownload = await downloadTagDocumentPdf({
        tags: previewTags,
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
    previewTags,
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
        tags: previewTags,
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
    previewTags,
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
        onPrint={handlePrint}
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
        previewTags={previewTags}
        visiblePreviewTags={visiblePreviewTags}
        widthInches={widthInches}
        heightInches={heightInches}
      />
    </section>
  );
}
