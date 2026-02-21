"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalStorage } from "@/hooks/use-local-storage";
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
  title: string;
  price?: number | null;
  privateNote?: string | null;
  listName?: string | null;
  ahsListing?: TagAhsListingData | null;
}

const PLACEHOLDER_LISTING: TagListingData = {
  id: "__placeholder__",
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
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAG_DESIGNER_STORAGE_KEY = "tag-designer-state-v2";
const MIN_TAG_WIDTH_INCHES = 1;
const MAX_TAG_WIDTH_INCHES = 6;
const MIN_TAG_HEIGHT_INCHES = 0.5;
const MAX_TAG_HEIGHT_INCHES = 4;

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
  title: { label: "", bold: true, fontSize: 13 },
  hybridizer: { label: "Hybridizer", bold: false, fontSize: 10 },
  year: { label: "", bold: false, fontSize: 10 },
  price: { label: "", bold: true, fontSize: 10 },
  ploidy: { label: "", bold: false, fontSize: 9 },
  bloomSize: { label: "Bloom Size", bold: false, fontSize: 10 },
  scapeHeight: { label: "Scape Height", bold: false, fontSize: 10 },
  bloomSeason: { label: "Bloom Season", bold: false, fontSize: 10 },
  bloomHabit: { label: "Bloom Habit", bold: false, fontSize: 10 },
  color: { label: "", bold: false, fontSize: 10 },
  form: { label: "", bold: false, fontSize: 10 },
  foliageType: { label: "Foliage Type", bold: false, fontSize: 10 },
  fragrance: { label: "Fragrance", bold: false, fontSize: 9 },
  budcount: { label: "Bud Count", bold: false, fontSize: 10 },
  branches: { label: "Branches", bold: false, fontSize: 10 },
  parentage: { label: "Parentage", bold: false, fontSize: 9 },
  sculpting: { label: "Sculpting", bold: false, fontSize: 9 },
  foliage: { label: "Foliage", bold: false, fontSize: 9 },
  flower: { label: "Flower", bold: false, fontSize: 9 },
  privateNote: { label: "Note", bold: false, fontSize: 9 },
  listName: { label: "List", bold: false, fontSize: 9 },
  customText: { label: "", bold: false, fontSize: 10 },
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
        fontSize: 20,
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
        textAlign: "right",
        fontSize: 14,
        bold: false,
        italic: false,
        underline: false,
        label: "",
      },
      {
        fieldId: "year",
        width: 1,
        textAlign: "left",
        fontSize: 14,
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
  rows: DEFAULT_ROWS,
};

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
      return toNonEmptyString(listing.ahsListing?.ploidy);
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

  return {
    fieldId,
    width: clamp(Math.round(Number(cell.width) || 1), 1, 12),
    textAlign: VALID_TEXT_ALIGNS.has(cell.textAlign!)
      ? cell.textAlign!
      : "left",
    fontSize: clamp(Number(cell.fontSize) || defaults.fontSize, 6, 28),
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
    rows: rows.length > 0 ? rows : DEFAULT_TAG_DESIGNER_STATE.rows,
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
        if (!value) continue;
        text = cell.label ? `${cell.label}: ${value}` : value;
      }

      resolved.push({
        id: `${listing.id}-${row.id}-${cell.fieldId}`,
        text,
        width: cell.width,
        textAlign: cell.textAlign,
        fontSize: cell.fontSize,
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
  ].join("; ");
}

export function createTagPrintDocumentHtml({
  tags,
  widthInches,
  heightInches,
}: {
  tags: TagPreviewData[];
  widthInches: number;
  heightInches: number;
}) {
  const tagMarkup = tags
    .map((tag) => {
      const rowsHtml = tag.rows
        .map((row) => {
          const cols = row.cells.map((c) => `${c.width}fr`).join(" ");
          const cellsHtml = row.cells
            .map(
              (cell) =>
                `<div class="cell" style="${cellStyleAsCss(cell)}">${escapeHtml(cell.text)}</div>`,
            )
            .join("");
          return `<div class="row" style="grid-template-columns: ${cols};">${cellsHtml}</div>`;
        })
        .join("");

      return `<article class="tag">${rowsHtml}</article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Daylily Tag Print</title>
    <style>
      * { box-sizing: border-box; }
      @page { margin: 0.2in; }
      body {
        margin: 0;
        padding: 0.15in;
        font-family: Arial, sans-serif;
        color: #111;
      }
      .sheet {
        display: flex;
        flex-wrap: wrap;
        gap: 0.1in;
      }
      .tag {
        width: ${widthInches}in;
        min-height: ${heightInches}in;
        border: 1px solid #000;
        padding: 0.06in 0.08in;
        overflow: hidden;
        page-break-inside: avoid;
      }
      .row {
        display: grid;
        column-gap: 0.06in;
      }
      .row + .row {
        margin-top: 1px;
      }
      .cell {
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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

function printTagDocument(html: string) {
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
  if (!frameDocument) {
    cleanup();
    toast.error("Unable to prepare tag document.");
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  window.setTimeout(() => {
    const iframeWindow = iframe.contentWindow;
    if (!iframeWindow) {
      cleanup();
      toast.error("Unable to print tag document.");
      return;
    }

    iframeWindow.focus();
    iframeWindow.print();
    window.setTimeout(cleanup, 1000);
  }, 400);
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
  "grid grid-cols-[3rem_7rem_5rem_2.5rem_3rem_3rem_max-content_1.5rem] items-center justify-items-start gap-x-1.5";

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

// ---------------------------------------------------------------------------
// Main designer panel
// ---------------------------------------------------------------------------

export function TagDesignerPanel({ listings }: { listings: TagListingData[] }) {
  const [storedState, setStoredState] = useLocalStorage<TagDesignerState>(
    TAG_DESIGNER_STORAGE_KEY,
    DEFAULT_TAG_DESIGNER_STATE,
  );

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

  const previewTags = React.useMemo<TagPreviewData[]>(
    () => {
      const toPreview =
        listings.length > 0 ? listings : [PLACEHOLDER_LISTING];
      return toPreview.map((listing) => ({
        id: listing.id,
        rows: buildResolvedRowsForListing(listing, state.rows),
      }));
    },
    [listings, state.rows],
  );

  const visiblePreviewTags = previewTags.slice(0, 8);

  // -- Row mutations --

  const updateRow = (rowIndex: number, updater: (row: TagRow) => TagRow) => {
    updateState((prev) => ({
      ...prev,
      rows: prev.rows.map((r, i) => (i === rowIndex ? updater(r) : r)),
    }));
  };

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

  const handlePrint = () => {
    if (!previewTags.length) {
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

  return (
    <section className="border-border bg-card mx-auto max-w-5xl space-y-4 rounded-lg border p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tag Designer</h2>
          <p className="text-muted-foreground text-sm">
            {listings.length} selected listing
            {listings.length === 1 ? "" : "s"}. Build your tag layout
            row-by-row.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => downloadSelectedListingsCsv(listings, state.rows)}
            disabled={!listings.length}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button onClick={handlePrint} disabled={!listings.length}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="border-border grid gap-3 rounded-md border p-3 md:grid-cols-[260px,1fr]">
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

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          {state.sizePresetId === "custom" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="custom-width-input">Width (in)</Label>
                <Input
                  id="custom-width-input"
                  inputMode="decimal"
                  value={state.customWidthInches.toFixed(2)}
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
                  value={state.customHeightInches.toFixed(2)}
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
          )}

          <p className="text-muted-foreground text-xs">
            Active: {widthInches.toFixed(2)}&quot; × {heightInches.toFixed(2)}
            &quot;
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Layout</h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStoredState(DEFAULT_TAG_DESIGNER_STATE)}
              title="Reset to default layout"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1 h-3 w-3" />
              Add Row
            </Button>
          </div>
        </div>

        {state.rows.length > 0 && (
          <div className="overflow-x-auto px-3 pb-1">
            <div
              className={cn(
                CELL_GRID,
                "text-muted-foreground min-w-[480px] text-[10px]",
              )}
            >
              <span />
              <span>Field</span>
              <span>Label</span>
              <span>Width</span>
              <span>Align</span>
              <span>Size</span>
              <span />
              <span>Style</span>
              <span />
            </div>
          </div>
        )}

        <div className="space-y-2">
          {state.rows.map((row, rowIndex) => (
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
                    onClick={() => moveRow(rowIndex, -1)}
                    title="Move row up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 px-0"
                    disabled={rowIndex === state.rows.length - 1}
                    onClick={() => moveRow(rowIndex, 1)}
                    title="Move row down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-6 w-6 px-0"
                    onClick={() => removeRow(rowIndex)}
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
                <div className="min-w-[480px] space-y-1">
                  {row.cells.map((cell, cellIndex) => (
                    <TagCellEditor
                      key={`${row.id}-${cellIndex}`}
                      cell={cell}
                      isFirst={cellIndex === 0}
                      isLast={cellIndex === row.cells.length - 1}
                      onUpdate={(updated) =>
                        updateRow(rowIndex, (r) => ({
                          ...r,
                          cells: r.cells.map((c, i) =>
                            i === cellIndex ? updated : c,
                          ),
                        }))
                      }
                      onRemove={() =>
                        updateRow(rowIndex, (r) => ({
                          ...r,
                          cells: r.cells.filter((_, i) => i !== cellIndex),
                        }))
                      }
                      onMoveUp={() => moveCell(rowIndex, cellIndex, -1)}
                      onMoveDown={() => moveCell(rowIndex, cellIndex, 1)}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => addCellToRow(rowIndex)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Cell
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Preview</h3>
          <div className="flex items-center gap-2">
            {listings.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Sample preview — select listings below
              </p>
            )}
            {listings.length > 0 &&
              previewTags.length > visiblePreviewTags.length && (
                <p className="text-muted-foreground text-xs">
                  Showing first {visiblePreviewTags.length} of {previewTags.length}{" "}
                  tags
                </p>
              )}
          </div>
        </div>

        {visiblePreviewTags.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {visiblePreviewTags.map((tag) => (
              <article
                key={tag.id}
                className="border-border bg-background rounded-md border border-dashed p-2"
                style={{
                  width: `${widthInches}in`,
                  minHeight: `${heightInches}in`,
                }}
              >
                {tag.rows.map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-x-2"
                    style={{
                      gridTemplateColumns: row.cells
                        .map((c) => `${c.width}fr`)
                        .join(" "),
                    }}
                  >
                    {row.cells.map((cell) => (
                      <p
                        key={cell.id}
                        className={cn(
                          "min-w-0 truncate leading-tight",
                          cell.bold && "font-semibold",
                          cell.italic && "italic",
                          cell.underline && "underline",
                          cell.textAlign === "center" && "text-center",
                          cell.textAlign === "right" && "text-right",
                          cell.textAlign === "left" && "text-left",
                        )}
                        style={{ fontSize: `${cell.fontSize}px` }}
                      >
                        {cell.text}
                      </p>
                    ))}
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select listings from the table below to preview and print tags.
          </p>
        )}
      </div>
    </section>
  );
}
