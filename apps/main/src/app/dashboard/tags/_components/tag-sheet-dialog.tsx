"use client";

import * as React from "react";
import {
  ChevronDown,
  Download,
  FileDown,
  FileImage,
  FileText,
  Minus,
  Plus,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  MIN_SHEET_COLUMNS,
  MIN_SHEET_COPIES_PER_LABEL,
  MIN_SHEET_MARGIN_INCHES,
  MIN_SHEET_PADDING_INCHES,
  MIN_SHEET_ROWS,
  MIN_TAG_HEIGHT_INCHES,
  MIN_TAG_WIDTH_INCHES,
  formatSheetNumberForInput,
  normalizeSheetNumber,
  parseSheetNumberInput,
} from "./tag-designer-model";
import type {
  ResolvedSheetMetrics,
  TagPreviewData,
  TagSheetCreatorState,
  UpdateTagSheetCreatorState,
} from "./tag-designer-model";
import { TagPreviewCard } from "./tag-preview";

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
    <Field data-invalid={Boolean(errorMessage)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={`Decrease ${label}`}
          onClick={() => stepValue(-1)}
        >
          <Minus />
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
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={`Increase ${label}`}
          onClick={() => stepValue(1)}
        >
          <Plus />
        </Button>
      </div>

      {errorMessage ? (
        <FieldError id={`${id}-error`}>{errorMessage}</FieldError>
      ) : null}
    </Field>
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

export function TagSheetCreatorDialog(props: TagSheetCreatorDialogProps) {
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
    <FieldGroup className="grid md:grid-cols-2">
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

      <Field orientation="horizontal" className="md:col-span-2">
        <Checkbox
          id="sheet-print-dashed-borders"
          checked={sheetState.printDashedBorders}
          onCheckedChange={(checked) =>
            updateSheetState((previous) => ({
              ...previous,
              printDashedBorders: checked === true,
            }))
          }
        />
        <FieldLabel htmlFor="sheet-print-dashed-borders">
          Print dashed borders
        </FieldLabel>
      </Field>

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
                data-icon="inline-end"
                className={cn(
                  "transition-transform",
                  isPrintQuantityOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <FieldGroup>
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
              <FieldDescription>
                The same label is repeated together before printing the next
                label.
              </FieldDescription>
            </FieldGroup>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </FieldGroup>
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
    <div className="flex flex-col gap-1 text-sm">
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
        <Alert variant="destructive">
          <AlertDescription>
            Page too small for this layout. Required:{" "}
            {sheetMetrics.requiredWidthInches.toFixed(2)}&quot; ×{" "}
            {sheetMetrics.requiredHeightInches.toFixed(2)}&quot;.
          </AlertDescription>
        </Alert>
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
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">Sheet Preview</h4>
      {sheetMetrics.isValid && firstSheetPreviewTags.length > 0 ? (
        <>
          <div className="overflow-auto py-1">
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
                  className="border-border grid size-full content-start justify-start border bg-white"
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
    <DialogFooter>
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
            <Download data-icon="inline-start" />
            {isPreparingDownload ? "Preparing…" : "Download"}
            <ChevronDown data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => onDownloadSheetPages()}
              disabled={isPreparingDownload}
            >
              <FileDown />
              HTML Sheets (.html)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDownloadSheetPdf()}
              disabled={isPreparingDownload}
            >
              <FileText />
              PDF (.pdf)
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDownloadSheetImages()}
              disabled={isPreparingDownload}
            >
              <FileImage />
              Images (.zip)
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button type="button" onClick={onPrintSheets} disabled={!canExport}>
        <Printer data-icon="inline-start" />
        Print Sheets
      </Button>
    </DialogFooter>
  );
}
