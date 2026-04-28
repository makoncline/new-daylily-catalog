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
import { cn } from "@/lib/utils";
import {
  ALL_FIELD_IDS,
  CSS_PIXELS_PER_INCH,
  FIELD_DEFAULTS,
  FIELD_DISPLAY_NAMES,
  MAX_SHEET_COLUMNS,
  MAX_SHEET_COPIES_PER_LABEL,
  MAX_SHEET_MARGIN_INCHES,
  MAX_SHEET_PAGE_HEIGHT_INCHES,
  MAX_SHEET_PAGE_WIDTH_INCHES,
  MAX_SHEET_PADDING_INCHES,
  MAX_SHEET_ROWS,
  MAX_TAG_HEIGHT_INCHES,
  MAX_TAG_WIDTH_INCHES,
  MIN_SHEET_COLUMNS,
  MIN_SHEET_COPIES_PER_LABEL,
  MIN_SHEET_MARGIN_INCHES,
  MIN_SHEET_PAGE_HEIGHT_INCHES,
  MIN_SHEET_PAGE_WIDTH_INCHES,
  MIN_SHEET_PADDING_INCHES,
  MIN_SHEET_ROWS,
  MIN_TAG_HEIGHT_INCHES,
  MIN_TAG_WIDTH_INCHES,
  QR_OFFSET_INCHES,
  QR_RESERVED_BOTTOM_INCHES,
  QR_RESERVED_RIGHT_INCHES,
  QR_SIZE_INCHES,
  TAG_SIZE_PRESETS,
  TEMPLATE_IMPORT_ID,
  buildQrCodeSvgMarkup,
  formatSheetNumberForInput,
  normalizeSheetNumber,
  parseSheetNumberInput,
  resolveCellFontSizePx,
  clamp,
} from "./tag-designer-model";
import type {
  ResolvedSheetMetrics,
  ResolvedTagLayoutTemplate,
  StoredTagLayoutTemplate,
  TagCell,
  TagDesignerState,
  TagFieldId,
  TagListingData,
  TagPreviewData,
  TagRow,
  TagSheetCreatorState,
  TagTextAlign,
  UpdateTagDesignerState,
  UpdateTagSheetCreatorState,
} from "./tag-designer-model";
import { useTagDesignerController } from "./use-tag-designer-controller";

export { createTagPrintDocumentHtml, createTagSheetDocumentHtml } from "./tag-designer-export";
export type { TagListingData } from "./tag-designer-model";

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
  const {
    controlsProps,
    headerProps,
    layoutProps,
    previewProps,
    sheetCreatorDialogProps,
  } = useTagDesignerController({ listings });

  return (
    <section className="border-border bg-card mx-auto max-w-5xl space-y-4 rounded-lg border p-4">
      <TagDesignerHeader {...headerProps} />

      <TagSheetCreatorDialog {...sheetCreatorDialogProps} />

      <TagDesignerControls {...controlsProps} />

      <TagDesignerLayout {...layoutProps} />

      <TagDesignerPreview {...previewProps} />
    </section>
  );
}
