"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";

type TagFieldId =
  | "title"
  | "hybridizer"
  | "year"
  | "price"
  | "bloomSize"
  | "scapeHeight"
  | "bloomSeason"
  | "privateNote"
  | "listName";

type TagFieldSlot = "left" | "right";

interface TagAhsListingData {
  hybridizer?: string | null;
  year?: string | number | null;
  bloomSize?: string | null;
  scapeHeight?: string | null;
  bloomSeason?: string | null;
}

export interface TagListingData {
  id: string;
  title: string;
  price?: number | null;
  privateNote?: string | null;
  listName?: string | null;
  ahsListing?: TagAhsListingData | null;
}

interface TagSizePreset {
  id: string;
  label: string;
  widthInches: number;
  heightInches: number;
}

type TagTextAlign = "left" | "right";

interface TagFieldConfig {
  id: TagFieldId;
  include: boolean;
  label: string;
  showLabel: boolean;
  slot: TagFieldSlot;
  textAlign: TagTextAlign;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface TagDesignerState {
  sizePresetId: string;
  customWidthInches: number;
  customHeightInches: number;
  fields: TagFieldConfig[];
}

interface TagLine {
  id: string;
  text: string;
  slot: TagFieldSlot;
  textAlign: TagTextAlign;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface TagPreviewData {
  id: string;
  lines: TagLine[];
}

const TAG_DESIGNER_STORAGE_KEY = "tag-designer-state-v1";
const MIN_TAG_WIDTH_INCHES = 1;
const MAX_TAG_WIDTH_INCHES = 3.5;
const MIN_TAG_HEIGHT_INCHES = 0.5;
const MAX_TAG_HEIGHT_INCHES = 3.5;

const TAG_SIZE_PRESETS: TagSizePreset[] = [
  {
    id: "brother-tze-1",
    label: 'Brother TZe 1.00" x 3.50"',
    widthInches: 3.5,
    heightInches: 1,
  },
  {
    id: "compact-0.75",
    label: 'Compact 0.75" x 3.00"',
    widthInches: 3,
    heightInches: 0.75,
  },
  {
    id: "roomy-1.25",
    label: 'Roomy 1.25" x 3.50"',
    widthInches: 3.5,
    heightInches: 1.25,
  },
  {
    id: "custom",
    label: "Custom",
    widthInches: 3.5,
    heightInches: 1,
  },
];

const DEFAULT_FIELDS: TagFieldConfig[] = [
  {
    id: "title",
    include: true,
    label: "Title",
    showLabel: false,
    slot: "left",
    textAlign: "left",
    fontSize: 13,
    bold: true,
    italic: false,
    underline: false,
  },
  {
    id: "hybridizer",
    include: true,
    label: "Hybridizer",
    showLabel: true,
    slot: "left",
    textAlign: "left",
    fontSize: 10,
    bold: false,
    italic: false,
    underline: false,
  },
  {
    id: "year",
    include: true,
    label: "Year",
    showLabel: true,
    slot: "left",
    textAlign: "left",
    fontSize: 10,
    bold: false,
    italic: false,
    underline: false,
  },
  {
    id: "price",
    include: false,
    label: "Price",
    showLabel: true,
    slot: "right",
    textAlign: "right",
    fontSize: 10,
    bold: true,
    italic: false,
    underline: false,
  },
  {
    id: "bloomSize",
    include: false,
    label: "Bloom",
    showLabel: true,
    slot: "right",
    textAlign: "right",
    fontSize: 10,
    bold: false,
    italic: false,
    underline: false,
  },
  {
    id: "scapeHeight",
    include: false,
    label: "Scape",
    showLabel: true,
    slot: "right",
    textAlign: "right",
    fontSize: 10,
    bold: false,
    italic: false,
    underline: false,
  },
  {
    id: "bloomSeason",
    include: false,
    label: "Season",
    showLabel: true,
    slot: "right",
    textAlign: "right",
    fontSize: 10,
    bold: false,
    italic: false,
    underline: false,
  },
  {
    id: "privateNote",
    include: false,
    label: "Note",
    showLabel: true,
    slot: "left",
    textAlign: "left",
    fontSize: 10,
    bold: false,
    italic: true,
    underline: false,
  },
  {
    id: "listName",
    include: false,
    label: "List",
    showLabel: true,
    slot: "right",
    textAlign: "right",
    fontSize: 10,
    bold: false,
    italic: false,
    underline: false,
  },
];

const DEFAULT_TAG_DESIGNER_STATE: TagDesignerState = {
  sizePresetId: "brother-tze-1",
  customWidthInches: 3.5,
  customHeightInches: 1,
  fields: DEFAULT_FIELDS,
};

const FIELD_DISPLAY_NAMES: Record<TagFieldId, string> = {
  title: "Title",
  hybridizer: "Hybridizer",
  year: "Year",
  price: "Price",
  bloomSize: "Bloom Size",
  scapeHeight: "Scape Height",
  bloomSeason: "Bloom Season",
  privateNote: "Private Note",
  listName: "List Name",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseInches(input: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseFloat(input);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Number.parseFloat(clamp(parsed, min, max).toFixed(2));
}

function toNonEmptyString(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

function resolveFieldValue(listing: TagListingData, fieldId: TagFieldId): string | null {
  switch (fieldId) {
    case "title":
      return toNonEmptyString(listing.title);
    case "hybridizer":
      return toNonEmptyString(listing.ahsListing?.hybridizer);
    case "year":
      return listing.ahsListing?.year ? String(listing.ahsListing.year) : null;
    case "price":
      return typeof listing.price === "number" ? `$${listing.price.toFixed(2)}` : null;
    case "bloomSize":
      return toNonEmptyString(listing.ahsListing?.bloomSize);
    case "scapeHeight":
      return toNonEmptyString(listing.ahsListing?.scapeHeight);
    case "bloomSeason":
      return toNonEmptyString(listing.ahsListing?.bloomSeason);
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

function sanitizeTagFields(input: TagFieldConfig[]) {
  const defaultsById = new Map(DEFAULT_FIELDS.map((field) => [field.id, field]));
  const seen = new Set<TagFieldId>();
  const result: TagFieldConfig[] = [];

  for (const field of input) {
    const defaults = defaultsById.get(field.id);
    if (!defaults || seen.has(field.id)) continue;
    seen.add(field.id);

    result.push({
      ...defaults,
      ...field,
      include: Boolean(field.include),
      showLabel: Boolean(field.showLabel),
      slot: field.slot === "right" ? "right" : "left",
      textAlign: (field as TagFieldConfig).textAlign === "right" ? "right" : "left",
      fontSize: clamp(Number(field.fontSize) || defaults.fontSize, 8, 24),
      bold: Boolean(field.bold),
      italic: Boolean(field.italic),
      underline: Boolean(field.underline),
      label: typeof field.label === "string" && field.label.trim() ? field.label : defaults.label,
    });
  }

  for (const defaults of DEFAULT_FIELDS) {
    if (seen.has(defaults.id)) continue;
    result.push(defaults);
  }

  return result;
}

function sanitizeTagDesignerState(state: TagDesignerState): TagDesignerState {
  const presetExists = TAG_SIZE_PRESETS.some((preset) => preset.id === state.sizePresetId);

  return {
    sizePresetId: presetExists ? state.sizePresetId : DEFAULT_TAG_DESIGNER_STATE.sizePresetId,
    customWidthInches: clamp(
      Number(state.customWidthInches) || DEFAULT_TAG_DESIGNER_STATE.customWidthInches,
      MIN_TAG_WIDTH_INCHES,
      MAX_TAG_WIDTH_INCHES,
    ),
    customHeightInches: clamp(
      Number(state.customHeightInches) || DEFAULT_TAG_DESIGNER_STATE.customHeightInches,
      MIN_TAG_HEIGHT_INCHES,
      MAX_TAG_HEIGHT_INCHES,
    ),
    fields: sanitizeTagFields(state.fields),
  };
}

export function buildTagLinesForListing(
  listing: TagListingData,
  fields: TagFieldConfig[],
): TagLine[] {
  const lines: TagLine[] = [];

  for (const field of fields) {
    if (!field.include) continue;
    const value = resolveFieldValue(listing, field.id);
    if (!value) continue;

    lines.push({
      id: `${listing.id}-${field.id}`,
      text: field.showLabel ? `${field.label}: ${value}` : value,
      slot: field.slot,
      textAlign: field.textAlign,
      fontSize: field.fontSize,
      bold: field.bold,
      italic: field.italic,
      underline: field.underline,
    });
  }

  if (lines.length > 0) {
    return lines;
  }

  return [
    {
      id: `${listing.id}-placeholder`,
      text: "No included fields with values",
      slot: "left",
      textAlign: "left",
      fontSize: 10,
      bold: false,
      italic: true,
      underline: false,
    },
  ];
}

function lineStyleAsCss(line: TagLine) {
  return [
    `font-size: ${line.fontSize}px`,
    `font-weight: ${line.bold ? 700 : 400}`,
    `font-style: ${line.italic ? "italic" : "normal"}`,
    `text-decoration: ${line.underline ? "underline" : "none"}`,
    `text-align: ${line.textAlign}`,
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
      const leftLines = tag.lines
        .filter((line) => line.slot === "left")
        .map(
          (line) =>
            `<div class="line" style="${lineStyleAsCss(line)}">${escapeHtml(line.text)}</div>`,
        )
        .join("");

      const rightLines = tag.lines
        .filter((line) => line.slot === "right")
        .map(
          (line) =>
            `<div class="line" style="${lineStyleAsCss(line)}">${escapeHtml(line.text)}</div>`,
        )
        .join("");

      return `<article class="tag"><div class="tag-grid"><div class="slot">${leftLines}</div><div class="slot">${rightLines}</div></div></article>`;
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
      .tag-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 0.08in;
        height: 100%;
      }
      .slot {
        min-height: 100%;
      }
      .line {
        line-height: 1.2;
      }
      .line + .line {
        margin-top: 2px;
      }
    </style>
  </head>
  <body>
    <main class="sheet">${tagMarkup}</main>
  </body>
</html>`;
}

function printTagDocument(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "8.5in";
  iframe.style.height = "11in";
  iframe.style.border = "0";

  const cleanup = () => {
    iframe.remove();
  };

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

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function downloadSelectedListingsCsv(
  listings: TagListingData[],
  fields: TagFieldConfig[],
) {
  const includedFields = fields.filter((f) => f.include);
  if (!includedFields.length || !listings.length) return;

  const header = includedFields.map((f) => escapeCsvCell(FIELD_DISPLAY_NAMES[f.id]));
  const rows = listings.map((listing) =>
    includedFields.map((f) => {
      const raw = resolveFieldValue(listing, f.id);
      return raw ? escapeCsvCell(raw) : "";
    }),
  );

  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tag-listings.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

const GRID_COLUMN_HEADERS = [
  "Order",
  "Field",
  "Label",
  "Show",
  "Slot",
  "Align",
  "Size",
  "Style",
] as const;

interface TagFieldSettingsRowProps {
  field: TagFieldConfig;
  isFirst: boolean;
  isLast: boolean;
  onLabelChange: (label: string) => void;
  onToggleShowLabel: (showLabel: boolean) => void;
  onSlotChange: (slot: TagFieldSlot) => void;
  onTextAlignChange: (textAlign: TagTextAlign) => void;
  onFontSizeChange: (fontSize: number) => void;
  onToggleStyle: (styleKey: "bold" | "italic" | "underline") => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function TagFieldSettingsRow({
  field,
  isFirst,
  isLast,
  onLabelChange,
  onToggleShowLabel,
  onSlotChange,
  onTextAlignChange,
  onFontSizeChange,
  onToggleStyle,
  onMoveUp,
  onMoveDown,
}: TagFieldSettingsRowProps) {
  return (
    <>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 px-0"
          disabled={isFirst}
          onClick={onMoveUp}
          title="Move up"
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 px-0"
          disabled={isLast}
          onClick={onMoveDown}
          title="Move down"
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>

      <span className="text-sm font-medium">
        {FIELD_DISPLAY_NAMES[field.id]}
      </span>

      <Input
        id={`label-${field.id}`}
        value={field.label}
        onChange={(event) => onLabelChange(event.target.value)}
        placeholder={FIELD_DISPLAY_NAMES[field.id]}
        className="h-8"
      />

      <div className="flex items-center gap-1.5">
        <Checkbox
          id={`show-label-${field.id}`}
          checked={field.showLabel}
          onCheckedChange={(value) => onToggleShowLabel(Boolean(value))}
          className="h-3.5 w-3.5"
        />
        <Label
          htmlFor={`show-label-${field.id}`}
          className="text-xs text-muted-foreground"
        >
          Label
        </Label>
      </div>

      <select
        id={`slot-${field.id}`}
        className="h-8 rounded-md border border-border bg-background px-1.5 text-xs"
        value={field.slot}
        onChange={(event) => onSlotChange(event.target.value as TagFieldSlot)}
      >
        <option value="left">L</option>
        <option value="right">R</option>
      </select>

      <select
        id={`text-align-${field.id}`}
        className="h-8 rounded-md border border-border bg-background px-1.5 text-xs"
        value={field.textAlign}
        onChange={(event) => onTextAlignChange(event.target.value as TagTextAlign)}
      >
        <option value="left">Left</option>
        <option value="right">Right</option>
      </select>

      <div className="flex items-center gap-1">
        <Input
          id={`font-size-${field.id}`}
          type="number"
          min={8}
          max={24}
          value={field.fontSize}
          onChange={(event) =>
            onFontSizeChange(clamp(Number.parseInt(event.target.value, 10) || 10, 8, 24))
          }
          className="h-8 w-14"
        />
        <span className="text-xs text-muted-foreground">px</span>
      </div>

      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant={field.bold ? "default" : "outline"}
          size="sm"
          className="h-7 w-7 px-0"
          onClick={() => onToggleStyle("bold")}
          title="Bold"
        >
          B
        </Button>
        <Button
          type="button"
          variant={field.italic ? "default" : "outline"}
          size="sm"
          className="h-7 w-7 px-0 italic"
          onClick={() => onToggleStyle("italic")}
          title="Italic"
        >
          I
        </Button>
        <Button
          type="button"
          variant={field.underline ? "default" : "outline"}
          size="sm"
          className="h-7 w-7 px-0 underline"
          onClick={() => onToggleStyle("underline")}
          title="Underline"
        >
          U
        </Button>
      </div>
    </>
  );
}

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
    TAG_SIZE_PRESETS.find((preset) => preset.id === state.sizePresetId) ?? TAG_SIZE_PRESETS[0]!;
  const widthInches =
    activeSizePreset.id === "custom"
      ? state.customWidthInches
      : activeSizePreset.widthInches;
  const heightInches =
    activeSizePreset.id === "custom"
      ? state.customHeightInches
      : activeSizePreset.heightInches;

  const previewTags = React.useMemo<TagPreviewData[]>(
    () =>
      listings.map((listing) => ({
        id: listing.id,
        lines: buildTagLinesForListing(listing, state.fields),
      })),
    [listings, state.fields],
  );

  const visiblePreviewTags = previewTags.slice(0, 8);

  const updateField = (
    fieldId: TagFieldId,
    updater: (field: TagFieldConfig) => TagFieldConfig,
  ) => {
    updateState((previous) => ({
      ...previous,
      fields: previous.fields.map((field) =>
        field.id === fieldId ? updater(field) : field,
      ),
    }));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    updateState((previous) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= previous.fields.length) {
        return previous;
      }

      const fields = [...previous.fields];
      const current = fields[index];
      fields[index] = fields[nextIndex]!;
      fields[nextIndex] = current!;

      return {
        ...previous,
        fields,
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
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tag Designer</h2>
          <p className="text-sm text-muted-foreground">
            {listings.length} selected listing{listings.length === 1 ? "" : "s"}.
            Configure fields once and it will persist in this browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => downloadSelectedListingsCsv(listings, state.fields)}
            disabled={!listings.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>

          <Button onClick={handlePrint} disabled={!listings.length}>
            <Printer className="mr-2 h-4 w-4" />
            Print Tags
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[260px,1fr]">
        <div className="space-y-2">
          <Label htmlFor="tag-size-select">Tag Size</Label>
          <select
            id="tag-size-select"
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={state.sizePresetId}
            onChange={(event) =>
              updateState((previous) => ({
                ...previous,
                sizePresetId: event.target.value,
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
                <Label htmlFor="custom-width-input">Custom Width (in)</Label>
                <Input
                  id="custom-width-input"
                  inputMode="decimal"
                  value={state.customWidthInches.toFixed(2)}
                  onChange={(event) =>
                    updateState((previous) => ({
                      ...previous,
                      customWidthInches: parseInches(
                        event.target.value,
                        previous.customWidthInches,
                        MIN_TAG_WIDTH_INCHES,
                        MAX_TAG_WIDTH_INCHES,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-height-input">Custom Height (in)</Label>
                <Input
                  id="custom-height-input"
                  inputMode="decimal"
                  value={state.customHeightInches.toFixed(2)}
                  onChange={(event) =>
                    updateState((previous) => ({
                      ...previous,
                      customHeightInches: parseInches(
                        event.target.value,
                        previous.customHeightInches,
                        MIN_TAG_HEIGHT_INCHES,
                        MAX_TAG_HEIGHT_INCHES,
                      ),
                    }))
                  }
                />
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Active size: {widthInches.toFixed(2)}&quot; x {heightInches.toFixed(2)}&quot;
            (max width {MAX_TAG_WIDTH_INCHES.toFixed(2)}&quot;)
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Fields</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-5">
          {state.fields.map((field) => (
            <div key={field.id} className="flex items-center gap-2">
              <Checkbox
                checked={field.include}
                onCheckedChange={(value) =>
                  updateField(field.id, (current) => ({
                    ...current,
                    include: Boolean(value),
                  }))
                }
                id={`include-${field.id}`}
              />
              <Label htmlFor={`include-${field.id}`} className="text-sm">
                {FIELD_DISPLAY_NAMES[field.id]}
              </Label>
            </div>
          ))}
        </div>

        {state.fields.some((f) => f.include) && (
          <div className="overflow-x-auto rounded-md border border-border px-3 py-2">
            <div className="grid min-w-[640px] grid-cols-[auto_5rem_7rem_auto_auto_auto_auto_auto] items-center gap-x-3 gap-y-2">
              {GRID_COLUMN_HEADERS.map((title) => (
                <span
                  key={title}
                  className="border-b border-border pb-1 text-xs font-medium text-muted-foreground"
                >
                  {title}
                </span>
              ))}

              {state.fields.map(
                (field, index) =>
                  field.include && (
                    <TagFieldSettingsRow
                      key={field.id}
                      field={field}
                      isFirst={index === 0}
                      isLast={index === state.fields.length - 1}
                      onLabelChange={(label) =>
                        updateField(field.id, (current) => ({ ...current, label }))
                      }
                      onToggleShowLabel={(showLabel) =>
                        updateField(field.id, (current) => ({ ...current, showLabel }))
                      }
                      onSlotChange={(slot) =>
                        updateField(field.id, (current) => ({ ...current, slot }))
                      }
                      onTextAlignChange={(textAlign) =>
                        updateField(field.id, (current) => ({ ...current, textAlign }))
                      }
                      onFontSizeChange={(fontSize) =>
                        updateField(field.id, (current) => ({ ...current, fontSize }))
                      }
                      onToggleStyle={(styleKey) =>
                        updateField(field.id, (current) => ({
                          ...current,
                          [styleKey]: !current[styleKey],
                        }))
                      }
                      onMoveUp={() => moveField(index, -1)}
                      onMoveDown={() => moveField(index, 1)}
                    />
                  ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Preview</h3>
          {previewTags.length > visiblePreviewTags.length && (
            <p className="text-xs text-muted-foreground">
              Showing first {visiblePreviewTags.length} of {previewTags.length} tags
            </p>
          )}
        </div>

        {visiblePreviewTags.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {visiblePreviewTags.map((tag) => {
              const leftLines = tag.lines.filter((line) => line.slot === "left");
              const rightLines = tag.lines.filter((line) => line.slot === "right");

              return (
                <article
                  key={tag.id}
                  className="rounded-md border border-dashed border-border bg-background p-2"
                  style={{
                    width: `${widthInches}in`,
                    minHeight: `${heightInches}in`,
                  }}
                >
                  <div className="grid h-full grid-cols-2 gap-3">
                    <div className="space-y-1">
                      {leftLines.map((line) => (
                        <p
                          key={line.id}
                          className={cn(
                            line.bold && "font-semibold",
                            line.italic && "italic",
                            line.underline && "underline",
                            line.textAlign === "right" ? "text-right" : "text-left",
                          )}
                          style={{ fontSize: `${line.fontSize}px` }}
                        >
                          {line.text}
                        </p>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {rightLines.map((line) => (
                        <p
                          key={line.id}
                          className={cn(
                            line.bold && "font-semibold",
                            line.italic && "italic",
                            line.underline && "underline",
                            line.textAlign === "right" ? "text-right" : "text-left",
                          )}
                          style={{ fontSize: `${line.fontSize}px` }}
                        >
                          {line.text}
                        </p>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select listings from the table below to preview and print tags.
          </p>
        )}
      </div>
    </section>
  );
}
