"use client";

import * as React from "react";
import {
  ChevronDown,
  Download,
  FileDown,
  FileImage,
  FileText,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
} from "./tag-designer-model";
import type {
  ResolvedSheetMetrics,
  TagPreviewData,
  TagSheetCreatorState,
  UpdateTagSheetCreatorState,
} from "./tag-designer-model";
import { TagNumberField } from "./tag-number-field";
import { TagSheetPreview } from "./tag-sheet-preview";

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

export function TagSheetCreatorDialog({
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
  const [settingsVersion, setSettingsVersion] = React.useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        onEscapeKeyDown={(event) => {
          if (
            event.target instanceof HTMLInputElement &&
            event.target.type === "number"
          ) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Sheet Creator</DialogTitle>
          <DialogDescription>
            Arrange selected tags onto printable sheets. Use the print dialog to
            print on paper or Save as PDF.
          </DialogDescription>
        </DialogHeader>
        <TagSheetSettings
          key={settingsVersion}
          copiesPerLabel={copiesPerLabel}
          onCopiesPerLabelChange={onCopiesPerLabelChange}
          sheetState={sheetState}
          updateSheetState={updateSheetState}
        />
        <TagSheetSummary
          copiesPerLabel={copiesPerLabel}
          selectedLabelCount={selectedLabelCount}
          sheetMetrics={sheetMetrics}
        />
        <TagSheetPreview
          previewTags={previewTags}
          sheetState={sheetState}
          sheetMetrics={sheetMetrics}
        />
        <TagSheetActions
          canExport={sheetMetrics.isValid && previewTags.length > 0}
          isPreparingDownload={isPreparingDownload}
          onDownloadSheetPages={onDownloadSheetPages}
          onDownloadSheetPdf={onDownloadSheetPdf}
          onDownloadSheetImages={onDownloadSheetImages}
          onPrintSheets={onPrintSheets}
          onResetToSingleTag={() => {
            onResetToSingleTag();
            setSettingsVersion((version) => version + 1);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function TagSheetSettings({
  copiesPerLabel,
  onCopiesPerLabelChange,
  sheetState,
  updateSheetState,
}: {
  copiesPerLabel: number;
  onCopiesPerLabelChange: (value: number) => void;
  sheetState: TagSheetCreatorState;
  updateSheetState: UpdateTagSheetCreatorState;
}) {
  const [isPrintQuantityOpen, setIsPrintQuantityOpen] = React.useState(false);

  return (
    <FieldGroup className="grid md:grid-cols-2">
      {SHEET_NUMBER_FIELDS.map((field) => (
        <TagNumberField
          showSteppers
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
              <TagNumberField
                showSteppers
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
  copiesPerLabel,
  selectedLabelCount,
  sheetMetrics,
}: {
  copiesPerLabel: number;
  selectedLabelCount: number;
  sheetMetrics: ResolvedSheetMetrics;
}) {
  const totalLabelCount = selectedLabelCount * copiesPerLabel;
  const estimatedSheetCount =
    sheetMetrics.tagsPerSheet > 0
      ? Math.ceil(totalLabelCount / sheetMetrics.tagsPerSheet)
      : 0;

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

function TagSheetActions({
  canExport,
  isPreparingDownload,
  onDownloadSheetImages,
  onDownloadSheetPages,
  onDownloadSheetPdf,
  onPrintSheets,
  onResetToSingleTag,
}: {
  canExport: boolean;
  isPreparingDownload: boolean;
  onDownloadSheetImages: () => void;
  onDownloadSheetPages: () => void;
  onDownloadSheetPdf: () => void;
  onPrintSheets: () => void;
  onResetToSingleTag: () => void;
}) {
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
