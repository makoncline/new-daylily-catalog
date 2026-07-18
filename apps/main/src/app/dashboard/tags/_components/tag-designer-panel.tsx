"use client";

// eslint-disable react/no-danger -- intentional static JSON-LD, style, or compatibility script injection.

import * as React from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileDown,
  FileImage,
  FileText,
  LayoutGrid,
  Minus,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CSS_PIXELS_PER_INCH,
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
  MIN_SHEET_PADDING_INCHES,
  MIN_SHEET_ROWS,
  MIN_TAG_HEIGHT_INCHES,
  MIN_TAG_WIDTH_INCHES,
  QR_SIZE_INCHES,
  TAG_SPACER_HEIGHT_INCHES,
  TAG_SIZE_PRESETS,
  TAG_TEMPLATE_FIELD_DEFINITIONS,
  buildTagTemplateAiInstructions,
  buildQrCodeSvgMarkup,
  findUnknownTagTemplateFields,
  formatSheetNumberForInput,
  getTagPreviewWarnings,
  getTagTemplateValidationIssues,
  getTagTextTemplateFieldIds,
  normalizeSheetNumber,
  parseSheetNumberInput,
  resolveCellFontSizePx,
} from "./tag-designer-model";
import type {
  ResolvedSheetMetrics,
  ResolvedTagLayoutTemplate,
  StoredTagLayoutTemplate,
  TagDesignerState,
  TagListingData,
  TagPreviewData,
  TagSheetCreatorState,
  UpdateTagDesignerState,
  UpdateTagSheetCreatorState,
} from "./tag-designer-model";
import { useTagDesignerController } from "./use-tag-designer-controller";

export {
  createTagPrintDocumentHtml,
  createTagSheetDocumentHtml,
} from "./tag-designer-export";
export type { TagListingData } from "./tag-designer-model";

type SheetNumberStateKey = {
  [Key in keyof TagSheetCreatorState]: TagSheetCreatorState[Key] extends number
    ? Key
    : never;
}[keyof TagSheetCreatorState];

const SHEET_NUMBER_FIELDS: Array<{
  id: string;
  label: string;
  stateKey: SheetNumberStateKey;
  min: number;
  max: number;
  step: number;
  decimals: number;
}> = [
  {
    id: "sheet-page-width",
    label: "Page width (in)",
    stateKey: "pageWidthInches",
    min: MIN_TAG_WIDTH_INCHES,
    max: MAX_SHEET_PAGE_WIDTH_INCHES,
    step: 0.01,
    decimals: 2,
  },
  {
    id: "sheet-page-height",
    label: "Page height (in)",
    stateKey: "pageHeightInches",
    min: MIN_TAG_HEIGHT_INCHES,
    max: MAX_SHEET_PAGE_HEIGHT_INCHES,
    step: 0.01,
    decimals: 2,
  },
  {
    id: "sheet-rows",
    label: "Rows",
    stateKey: "rows",
    min: MIN_SHEET_ROWS,
    max: MAX_SHEET_ROWS,
    step: 1,
    decimals: 0,
  },
  {
    id: "sheet-columns",
    label: "Columns",
    stateKey: "columns",
    min: MIN_SHEET_COLUMNS,
    max: MAX_SHEET_COLUMNS,
    step: 1,
    decimals: 0,
  },
  {
    id: "sheet-margin-x",
    label: "Page margin X (in)",
    stateKey: "marginXInches",
    min: MIN_SHEET_MARGIN_INCHES,
    max: MAX_SHEET_MARGIN_INCHES,
    step: 0.01,
    decimals: 2,
  },
  {
    id: "sheet-margin-y",
    label: "Page margin Y (in)",
    stateKey: "marginYInches",
    min: MIN_SHEET_MARGIN_INCHES,
    max: MAX_SHEET_MARGIN_INCHES,
    step: 0.01,
    decimals: 2,
  },
  {
    id: "sheet-padding-x",
    label: "Tag padding X (in)",
    stateKey: "paddingXInches",
    min: MIN_SHEET_PADDING_INCHES,
    max: MAX_SHEET_PADDING_INCHES,
    step: 0.01,
    decimals: 2,
  },
  {
    id: "sheet-padding-y",
    label: "Tag padding Y (in)",
    stateKey: "paddingYInches",
    min: MIN_SHEET_PADDING_INCHES,
    max: MAX_SHEET_PADDING_INCHES,
    step: 0.01,
    decimals: 2,
  },
];

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

function TagPreviewCard({
  tag,
  widthInches,
  heightInches,
  className,
}: {
  tag: TagPreviewData;
  widthInches: number;
  heightInches: number;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "bg-background grid items-center gap-2 overflow-hidden border border-dashed p-2",
        tag.qrCodeUrl ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1",
        className,
      )}
      style={{
        width: `${widthInches}in`,
        height: `${heightInches}in`,
      }}
    >
      <div className="min-w-0">
        {tag.rows.map((row) => (
          <React.Fragment key={row.id}>
            {row.isSpacer ? (
              <div
                aria-hidden="true"
                style={{ height: `${TAG_SPACER_HEIGHT_INCHES}in` }}
              />
            ) : (
              <div className="flex min-w-0 items-baseline justify-between gap-x-2">
                {row.cells.map((cell) => (
                  <p
                    key={cell.id}
                    className={cn(
                      "min-w-0 overflow-hidden leading-tight whitespace-nowrap",
                      row.cells.length === 1 && "w-full",
                      cell.bold && "font-semibold",
                      cell.italic && "italic",
                      cell.underline && "underline",
                      cell.textAlign === "center" && "text-center",
                      cell.textAlign === "right" && "text-right",
                      cell.textAlign === "left" && "text-left",
                    )}
                    style={{
                      flex: `${cell.width} 1 0`,
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
            )}
          </React.Fragment>
        ))}
      </div>

      {tag.qrCodeUrl ? (
        <QrCodeSvg
          qrCodeUrl={tag.qrCodeUrl}
          className="shrink-0 bg-white [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
          style={{
            width: `${QR_SIZE_INCHES}in`,
            height: `${QR_SIZE_INCHES}in`,
          }}
        />
      ) : null}
    </article>
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
}: Pick<TagDesignerHeaderProps, "selectedListingCount">) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Tag designer</h2>
      <p className="text-muted-foreground text-sm">
        {selectedListingCount} selected listing
        {selectedListingCount === 1 ? "" : "s"}. Choose the tag content, check
        the preview, then print.
      </p>
    </div>
  );
}

function TagDesignerOutputActions({
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
    <div className="border-border flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground text-xs">
        Print at <span className="text-foreground font-medium">100%</span> or{" "}
        <span className="text-foreground font-medium">Actual size</span>.
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onOpenSheetCreator}
          disabled={!hasListings}
        >
          <LayoutGrid className="mr-2 size-4" />
          Make sheet
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={!hasListings || isPreparingDownload}
            >
              {isPreparingDownload ? "Preparing…" : "Output options"}
              <ChevronDown className="ml-2 size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onSelect={() => onDownloadPages()}
              disabled={isPreparingDownload}
            >
              <FileDown className="size-4" />
              Pages (.html)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDownloadPdf()}
              disabled={isPreparingDownload}
            >
              <FileText className="size-4" />
              PDF (.pdf)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDownloadImages()}
              disabled={isPreparingDownload}
            >
              <FileImage className="size-4" />
              Images (.zip)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDownloadCsv()}
              disabled={isPreparingDownload}
            >
              <Download className="size-4" />
              CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={onPrint} disabled={!hasListings}>
          <Printer className="mr-2 size-4" />
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
          className="size-9 shrink-0"
          aria-label={`Decrease ${label}`}
          onClick={() => stepValue(-1)}
        >
          <Minus className="size-4" />
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
          className="size-9 shrink-0"
          aria-label={`Increase ${label}`}
          onClick={() => stepValue(1)}
        >
          <Plus className="size-4" />
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

function useTagSheetCreatorDialogController({
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

  return {
    canExport,
    copiesPerLabel,
    estimatedSheetCount,
    firstSheetPreviewTags,
    isPreparingDownload,
    isPrintQuantityOpen,
    marginXPx,
    marginYPx,
    onCopiesPerLabelChange,
    onDownloadSheetImages,
    onDownloadSheetPages,
    onDownloadSheetPdf,
    onOpenChange,
    onPrintSheets,
    onResetToSingleTag,
    open,
    paddingXPx,
    paddingYPx,
    pageHeightPx,
    pageWidthPx,
    previewScale,
    selectedLabelCount,
    setIsPrintQuantityOpen,
    sheetMetrics,
    sheetState,
    slotHeightPx,
    slotWidthPx,
    totalLabelCount,
    updateSheetState,
  };
}

function TagSheetCreatorDialog(props: TagSheetCreatorDialogProps) {
  const controller = useTagSheetCreatorDialogController(props);

  return <TagSheetCreatorDialogView controller={controller} />;
}

function TagSheetCreatorDialogView({
  controller,
}: {
  controller: ReturnType<typeof useTagSheetCreatorDialogController>;
}) {
  const { onOpenChange, open } = controller;

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

        <TagSheetSettings controller={controller} />

        <TagSheetSummary controller={controller} />

        <TagSheetPreview controller={controller} />

        <TagSheetActions controller={controller} />
      </DialogContent>
    </Dialog>
  );
}

function TagSheetSettings({
  controller,
}: {
  controller: ReturnType<typeof useTagSheetCreatorDialogController>;
}) {
  const {
    copiesPerLabel,
    isPrintQuantityOpen,
    onCopiesPerLabelChange,
    setIsPrintQuantityOpen,
    sheetState,
    updateSheetState,
  } = controller;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {SHEET_NUMBER_FIELDS.map((field) => (
        <SheetNumberField
          key={field.id}
          id={field.id}
          label={field.label}
          value={sheetState[field.stateKey]}
          min={field.min}
          max={field.max}
          step={field.step}
          decimals={field.decimals}
          onCommit={(nextValue) =>
            updateSheetState((previous) => ({
              ...previous,
              [field.stateKey]: nextValue,
            }))
          }
        />
      ))}

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
            className="size-4"
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
                  "size-4 transition-transform",
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
  );
}

function TagSheetSummary({
  controller,
}: {
  controller: ReturnType<typeof useTagSheetCreatorDialogController>;
}) {
  const {
    copiesPerLabel,
    estimatedSheetCount,
    selectedLabelCount,
    sheetMetrics,
    totalLabelCount,
  } = controller;

  return (
    <div className="space-y-1 text-sm">
      <p className="text-muted-foreground">
        Tag size on sheet (fixed to active tag size):{" "}
        {sheetMetrics.slotWidthInches.toFixed(2)}&quot; ×{" "}
        {sheetMetrics.slotHeightInches.toFixed(2)}&quot;
      </p>
      <p className="font-medium">
        {selectedLabelCount} label{selectedLabelCount === 1 ? "" : "s"}{" "}
        selected, {copiesPerLabel} cop{copiesPerLabel === 1 ? "y" : "ies"} of
        each, {totalLabelCount} total label
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
  );
}

function TagSheetPreview({
  controller,
}: {
  controller: ReturnType<typeof useTagSheetCreatorDialogController>;
}) {
  const {
    estimatedSheetCount,
    firstSheetPreviewTags,
    marginXPx,
    marginYPx,
    paddingXPx,
    paddingYPx,
    pageHeightPx,
    pageWidthPx,
    previewScale,
    selectedLabelCount,
    sheetMetrics,
    sheetState,
    slotHeightPx,
    slotWidthPx,
  } = controller;

  return (
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
                  className="bg-background border-border grid size-full content-start justify-start border"
                  style={{
                    padding: `${marginYPx}px ${marginXPx}px`,
                    gridTemplateColumns: `repeat(${sheetState.columns}, ${slotWidthPx}px)`,
                    gridTemplateRows: `repeat(${sheetState.rows}, ${slotHeightPx}px)`,
                    columnGap: `${paddingXPx}px`,
                    rowGap: `${paddingYPx}px`,
                  }}
                >
                  {firstSheetPreviewTags.map((tag) => (
                    <TagPreviewCard
                      key={`sheet-preview-${tag.id}`}
                      tag={tag}
                      widthInches={sheetMetrics.slotWidthInches}
                      heightInches={sheetMetrics.slotHeightInches}
                      className="border-muted-foreground/40"
                    />
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
  );
}

function TagSheetActions({
  controller,
}: {
  controller: ReturnType<typeof useTagSheetCreatorDialogController>;
}) {
  const {
    canExport,
    isPreparingDownload,
    onDownloadSheetImages,
    onDownloadSheetPages,
    onDownloadSheetPdf,
    onPrintSheets,
    onResetToSingleTag,
  } = controller;

  return (
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
            <Download className="mr-2 size-4" />
            {isPreparingDownload ? "Preparing…" : "Download"}
            <ChevronDown className="ml-2 size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() => onDownloadSheetPages()}
            disabled={isPreparingDownload}
          >
            <FileDown className="size-4" />
            HTML Sheets (.html)
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onDownloadSheetPdf()}
            disabled={isPreparingDownload}
          >
            <FileText className="size-4" />
            PDF (.pdf)
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onDownloadSheetImages()}
            disabled={isPreparingDownload}
          >
            <FileImage className="size-4" />
            Images (.zip)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button type="button" onClick={onPrintSheets} disabled={!canExport}>
        <Printer className="mr-2 size-4" />
        Print Sheets
      </Button>
    </DialogFooter>
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
  builtinTemplates: ResolvedTagLayoutTemplate[];
  customTemplateText: string;
  isCustomLayout: boolean;
  onApplyTemplate: (templateId: string) => void;
  onCustomTemplateChange: (template: string) => void;
  onDeleteTemplate: (templateId: string, templateName: string) => boolean;
  onResetLayout: () => void;
  onSaveTemplate: (name: string, sourceTemplateId?: string) => boolean;
  selectedTemplateId: string;
  state: TagDesignerState;
  updateState: UpdateTagDesignerState;
  userTemplates: StoredTagLayoutTemplate[];
  widthInches: number;
  heightInches: number;
}

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  "template-simple-name": 'Cultivar name · recommended 1" tag',
  "default-template": 'Name, hybridizer/year, and ploidy · recommended 1"',
  "template-sale-tag": 'Name, identity, ploidy, and price · recommended 1"',
  "template-grower-details":
    'Identity and growing traits · recommended 2" × 4" card',
};

function TagDesignerControls({
  builtinTemplates,
  customTemplateText,
  isCustomLayout,
  onApplyTemplate,
  onCustomTemplateChange,
  onDeleteTemplate,
  onResetLayout,
  onSaveTemplate,
  selectedTemplateId,
  state,
  updateState,
  userTemplates,
  widthInches,
  heightInches,
}: TagDesignerControlsProps) {
  const [isCustomEditorOpen, setIsCustomEditorOpen] =
    React.useState(isCustomLayout);
  const [isAiInstructionsOpen, setIsAiInstructionsOpen] = React.useState(false);
  const [templateName, setTemplateName] = React.useState("");
  const [customSourceTemplateId, setCustomSourceTemplateId] = React.useState<
    string | null
  >(isCustomLayout ? null : selectedTemplateId);
  const [customTemplateDraft, setCustomTemplateDraft] =
    React.useState(customTemplateText);
  const templateTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const unknownFields = findUnknownTagTemplateFields(customTemplateDraft);
  const validationIssues = getTagTemplateValidationIssues(customTemplateDraft);
  const usedFields = getTagTextTemplateFieldIds(customTemplateDraft);
  const includesPrivateNote = usedFields.includes("privateNote");
  const aiInstructions = buildTagTemplateAiInstructions(customTemplateDraft, {
    widthInches,
    heightInches,
    showQrCode: state.showQrCode,
  });
  const sourceUserTemplate = userTemplates.find(
    (template) => template.id === customSourceTemplateId,
  );

  React.useEffect(() => {
    if (isCustomLayout) setIsCustomEditorOpen(true);
  }, [isCustomLayout]);

  React.useEffect(() => {
    if (!isCustomEditorOpen) setCustomTemplateDraft(customTemplateText);
  }, [customTemplateText, isCustomEditorOpen]);

  const changeCustomTemplate = (template: string) => {
    setCustomTemplateDraft(template);
    onCustomTemplateChange(template);
  };

  const applyTemplate = (templateId: string) => {
    onApplyTemplate(templateId);
    setIsCustomEditorOpen(false);
    setCustomSourceTemplateId(templateId);
    setTemplateName("");
  };

  const copyAiInstructions = async () => {
    try {
      await navigator.clipboard.writeText(aiInstructions);
      toast.success(
        "AI prompt copied. Describe the tag you want, then paste back only the returned template.",
      );
    } catch {
      window.prompt("Copy AI instructions", aiInstructions);
    }
  };

  const beginCustomization = () => {
    setCustomSourceTemplateId(isCustomLayout ? null : selectedTemplateId);
    setCustomTemplateDraft(customTemplateText);
    const selectedUserTemplate = userTemplates.find(
      (template) => template.id === selectedTemplateId,
    );
    setTemplateName(selectedUserTemplate?.name ?? "");
    setIsCustomEditorOpen(true);
  };

  const discardCustomChanges = () => {
    if (customSourceTemplateId) {
      applyTemplate(customSourceTemplateId);
      return;
    }
    onResetLayout();
    setIsCustomEditorOpen(false);
  };

  const insertField = (fieldId: string) => {
    const textarea = templateTextareaRef.current;
    const token = `{{${fieldId}}}`;
    if (!textarea) {
      changeCustomTemplate(`${customTemplateDraft}${token}`);
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const nextTemplate = `${customTemplateDraft.slice(
      0,
      selectionStart,
    )}${token}${customTemplateDraft.slice(selectionEnd)}`;
    changeCustomTemplate(nextTemplate);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        selectionStart + token.length,
        selectionStart + token.length,
      );
    });
  };

  return (
    <div className="border-border space-y-5 rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="tag-size-select">Tag Size</Label>
          <select
            id="tag-size-select"
            className="border-border bg-background h-9 w-full rounded-md border px-2 text-sm"
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

        <label className="border-border flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
          <input
            id="layout-qr-toggle"
            type="checkbox"
            checked={state.showQrCode}
            onChange={(event) =>
              updateState((previous) => ({
                ...previous,
                showQrCode: event.target.checked,
              }))
            }
            className="size-4"
          />
          <span>Include QR code</span>
        </label>
      </div>

      {state.sizePresetId === "custom" ? (
        <div className="grid max-w-md grid-cols-2 gap-3">
          <TagDesignerCustomSizeInputs
            customWidthInches={state.customWidthInches}
            customHeightInches={state.customHeightInches}
            updateState={updateState}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Choose a template</h3>
          <p className="text-muted-foreground text-xs">
            Start with a common tag. You can customize it if you need more.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {builtinTemplates.map((template) => {
            const isSelected =
              !isCustomEditorOpen && selectedTemplateId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => applyTemplate(template.id)}
                className={cn(
                  "border-border bg-background hover:border-foreground/30 relative rounded-md border p-3 text-left transition-colors",
                  isSelected && "border-foreground ring-foreground ring-1",
                )}
              >
                {isSelected ? (
                  <Check className="absolute top-3 right-3 size-4" />
                ) : null}
                <span className="block pr-5 text-sm font-medium">
                  {template.name}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs leading-snug">
                  {TEMPLATE_DESCRIPTIONS[template.id]}
                </span>
              </button>
            );
          })}
        </div>

        {userTemplates.length > 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">
              Your templates
            </p>
            <div className="flex flex-wrap gap-2">
              {userTemplates.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    "border-border flex items-center rounded-md border",
                    !isCustomEditorOpen &&
                      selectedTemplateId === template.id &&
                      "border-foreground ring-foreground ring-1",
                  )}
                >
                  <button
                    type="button"
                    className="px-3 py-1.5 text-sm"
                    onClick={() => applyTemplate(template.id)}
                  >
                    {template.name}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-8"
                    aria-label={`Delete template ${template.name}`}
                    onClick={() => {
                      const didDelete = onDeleteTemplate(
                        template.id,
                        template.name,
                      );
                      if (didDelete && customSourceTemplateId === template.id) {
                        setCustomSourceTemplateId(null);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!isCustomEditorOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={beginCustomization}
          >
            <Pencil className="mr-1.5 size-3.5" />
            Customize this template
          </Button>
        ) : (
          <div className="bg-muted/30 space-y-3 rounded-md border p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label htmlFor="custom-tag-template">Customize layout</Label>
                <p className="text-muted-foreground text-xs">
                  One row per line. Listing fields use{" "}
                  <code>{"{{fieldName}}"}</code>. Text stays on one line and
                  shrinks to fit.
                </p>
                <p className="text-muted-foreground text-xs">
                  <code>#</code> large bold · <code>##</code> medium bold ·{" "}
                  <code>-</code> small · <code>|</code> left/right columns ·
                  blank line adds space
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={discardCustomChanges}
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  Discard changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAiInstructionsOpen(true)}
                >
                  <Sparkles className="mr-1.5 size-3.5" />
                  Get AI instructions
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="mr-1.5 size-3.5" />
                    Insert field
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-72 w-64 overflow-y-auto"
                >
                  {TAG_TEMPLATE_FIELD_DEFINITIONS.map((field) => (
                    <DropdownMenuItem
                      key={field.id}
                      onSelect={() => insertField(field.id)}
                    >
                      <span className="flex-1">{field.label}</span>
                      <code className="text-muted-foreground text-[11px]">
                        {`{{${field.id}}}`}
                      </code>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-muted-foreground text-xs">
                Up to two columns per row
              </span>
            </div>

            <Textarea
              ref={templateTextareaRef}
              id="custom-tag-template"
              aria-label="Custom template"
              value={customTemplateDraft}
              onChange={(event) => changeCustomTemplate(event.target.value)}
              className="min-h-28 resize-y font-mono text-sm leading-6"
              spellCheck={false}
            />

            {unknownFields.length > 0 ? (
              <p className="text-destructive text-xs">
                {unknownFields.map((field) => `{{${field}}}`).join(", ")}{" "}
                {unknownFields.length === 1 ? "is" : "are"} not an available
                field. Choose a field from Insert field.
              </p>
            ) : null}

            {validationIssues.map((issue) => (
              <p key={issue} className="text-destructive text-xs">
                {issue}
              </p>
            ))}

            {includesPrivateNote ? (
              <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlert className="size-3.5 shrink-0" />
                Private notes will be printed on the tag.
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="Template name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Name this layout"
                className="sm:max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                disabled={
                  templateName.trim().length === 0 ||
                  unknownFields.length > 0 ||
                  validationIssues.length > 0
                }
                onClick={() => {
                  if (onSaveTemplate(templateName, sourceUserTemplate?.id)) {
                    setTemplateName("");
                    setIsCustomEditorOpen(false);
                  }
                }}
              >
                {sourceUserTemplate ? "Save changes" : "Save as template"}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Saved templates stay in this browser.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={isAiInstructionsOpen}
        onOpenChange={setIsAiInstructionsOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Make a tag template with AI</DialogTitle>
            <DialogDescription>
              Copy this prompt into ChatGPT or another assistant, describe the
              tag you want, then paste only the template it returns into the
              editor.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="AI template instructions"
            readOnly
            value={aiInstructions}
            className="min-h-80 resize-none font-mono text-xs leading-5"
          />
          <div className="text-muted-foreground text-xs">
            {TAG_TEMPLATE_FIELD_DEFINITIONS.length} fields included.
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void copyAiInstructions();
              }}
            >
              <Copy className="mr-2 size-4" />
              Copy instructions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const previewWarnings = getTagPreviewWarnings({
    tags: previewTags,
    widthInches,
    heightInches,
  });

  return (
    <div className="bg-muted/20 space-y-3 rounded-md p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Preview</h3>
        <div className="flex items-center gap-2">
          {listingsCount === 0 ? (
            <p className="text-muted-foreground text-xs">
              Sample preview: select listings below
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

      {previewWarnings.length > 0 ? (
        <div className="space-y-1" role="status">
          {previewWarnings.map((warning) => (
            <p
              key={warning}
              className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400"
            >
              <TriangleAlert className="size-3.5 shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {visiblePreviewTags.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {visiblePreviewTags.map((tag) => (
            <TagPreviewCard
              key={tag.id}
              tag={tag}
              widthInches={widthInches}
              heightInches={heightInches}
              className="border-border rounded-md"
            />
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
  const { controlsProps, headerProps, previewProps, sheetCreatorDialogProps } =
    useTagDesignerController({ listings });

  return (
    <section className="border-border bg-card mx-auto max-w-5xl space-y-4 rounded-lg border p-4">
      <TagDesignerHeader
        selectedListingCount={headerProps.selectedListingCount}
      />

      <TagSheetCreatorDialog {...sheetCreatorDialogProps} />

      <TagDesignerControls {...controlsProps} />

      <TagDesignerPreview {...previewProps} />

      <TagDesignerOutputActions {...headerProps} />
    </section>
  );
}
