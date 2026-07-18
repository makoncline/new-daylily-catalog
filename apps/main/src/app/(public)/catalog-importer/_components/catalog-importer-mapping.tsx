"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  columnIndexToLabel,
  getHeaderRowSummary,
} from "@/lib/catalog-importer";
import {
  CATALOG_IMPORTER_MAPPING_FIELDS,
  getSourcePreviewCellText,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { CatalogImporterMappingFieldDefinition } from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

interface CatalogImporterMappingProps {
  controller: CatalogImporterWorkbenchController;
  onSubmit: () => void;
}

function MappingHelp({
  description,
  label,
}: {
  description: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`About ${label}`}
          aria-expanded={open}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-5 shrink-0 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <CircleHelp className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-pretty">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

function MappingField({
  controller,
  definition,
}: {
  controller: CatalogImporterWorkbenchController;
  definition: CatalogImporterMappingFieldDefinition;
}) {
  const selectId = `catalog-importer-map-${definition.field}`;
  const value = controller.mapping[definition.field];

  return (
    <Field className="gap-2">
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={selectId}>
          {definition.label}
          {definition.required ? (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </FieldLabel>
        <MappingHelp
          label={definition.label}
          description={definition.description}
        />
      </div>
      <FieldContent>
        <Select
          disabled={controller.matchingProgress !== null}
          value={value === null ? "none" : String(value)}
          onValueChange={(nextValue) =>
            controller.handleMappingChange(
              definition.field,
              nextValue === "none" ? null : Number(nextValue),
            )
          }
        >
          <SelectTrigger id={selectId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="none">
                {definition.required ? "Select a column" : "Do not include"}
              </SelectItem>
              {controller.sourceColumns.map((column) => (
                <SelectItem key={column.index} value={String(column.index)}>
                  {column.label}
                  {column.preview ? ` — ${column.preview}` : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
  );
}

function SpreadsheetPreview({
  controller,
  defaultOpen = true,
}: Pick<CatalogImporterMappingProps, "controller"> & {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="min-w-0 shadow-sm">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle role="heading" aria-level={2}>
              Spreadsheet preview
            </CardTitle>
            <CardDescription>
              The detected header row is highlighted. Row and column labels
              match the workbook.
            </CardDescription>
          </div>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
            >
              {open ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              <span className="sr-only">
                {open ? "Hide spreadsheet preview" : "Show spreadsheet preview"}
              </span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="max-w-full overflow-x-auto rounded-md border">
              <table className="w-max min-w-full border-collapse text-left text-xs">
                <caption className="sr-only">
                  First {controller.sourcePreviewRows.length.toLocaleString()}{" "}
                  rows of{" "}
                  {controller.selectedSheet?.name ?? "the selected sheet"}
                </caption>
                <thead className="bg-muted/60">
                  <tr>
                    <th
                      scope="col"
                      className="text-muted-foreground sticky left-0 z-10 border-r border-b bg-inherit px-2 py-2 font-mono font-normal"
                    >
                      Row
                    </th>
                    {controller.sourcePreviewColumnIndexes.map(
                      (columnIndex) => (
                        <th
                          key={columnIndex}
                          scope="col"
                          className="text-muted-foreground border-r border-b px-3 py-2 font-mono font-normal whitespace-nowrap last:border-r-0"
                        >
                          {columnIndexToLabel(columnIndex)}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {controller.sourcePreviewRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={
                        rowIndex === controller.headerRowIndex
                          ? "bg-primary/5 font-medium"
                          : "bg-background"
                      }
                    >
                      <th
                        scope="row"
                        className="text-muted-foreground sticky left-0 z-10 border-r border-b bg-inherit px-2 py-2 font-mono font-normal"
                      >
                        {rowIndex + 1}
                      </th>
                      {controller.sourcePreviewColumnIndexes.map(
                        (columnIndex) => (
                          <td
                            key={columnIndex}
                            className="max-w-72 border-r border-b px-3 py-2 align-top last:border-r-0"
                          >
                            <span className="line-clamp-3 whitespace-normal">
                              {getSourcePreviewCellText(
                                row[columnIndex] ?? null,
                              )}
                            </span>
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function CatalogImporterMapping({
  controller,
  onSubmit,
}: CatalogImporterMappingProps) {
  if (!controller.selectedSheet) {
    return null;
  }

  const progressValue = controller.matchingProgress
    ? (controller.matchingProgress.processed /
        Math.max(controller.matchingProgress.total, 1)) *
      100
    : 0;

  return (
    <section
      aria-labelledby="catalog-importer-mapping-heading"
      className="space-y-4"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <div className="order-2 min-w-0 lg:order-1">
          <SpreadsheetPreview
            controller={controller}
            defaultOpen={controller.matchedRows === null}
          />
        </div>

        <Card className="order-1 shadow-sm lg:order-2">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle
                id="catalog-importer-mapping-heading"
                role="heading"
                aria-level={2}
              >
                Map your columns
              </CardTitle>
              <CardDescription>
                Confirm which workbook columns become listing fields. Only
                cultivar name is required.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <TooltipProvider delayDuration={200}>
              <FieldGroup className="gap-5">
                <Field className="gap-2">
                  <div className="flex items-center gap-1.5">
                    <FieldLabel htmlFor="catalog-importer-header-row">
                      Header row
                    </FieldLabel>
                    <MappingHelp
                      label="Header row"
                      description="Pick the row that contains labels such as Name, Price, or Description."
                    />
                  </div>
                  <FieldContent>
                    <Select
                      disabled={controller.matchingProgress !== null}
                      value={
                        controller.headerRowIndex === null
                          ? "none"
                          : String(controller.headerRowIndex)
                      }
                      onValueChange={controller.handleHeaderChange}
                    >
                      <SelectTrigger id="catalog-importer-header-row">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">
                            No header row — use column letters
                          </SelectItem>
                          {controller.selectedSheet.rows
                            .slice(0, 12)
                            .map((row, rowIndex) => (
                              <SelectItem
                                key={rowIndex}
                                value={String(rowIndex)}
                              >
                                {getHeaderRowSummary(row, rowIndex)}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>

                {CATALOG_IMPORTER_MAPPING_FIELDS.map((definition) => (
                  <MappingField
                    key={definition.field}
                    controller={controller}
                    definition={definition}
                  />
                ))}
              </FieldGroup>
            </TooltipProvider>

            {controller.matchingProgress ? (
              <div
                className="space-y-2 rounded-lg border p-4"
                role="status"
                aria-label="Building catalog preview"
              >
                <div className="text-muted-foreground flex items-center justify-between gap-4 text-xs">
                  <span className="flex items-center gap-2">
                    <Spinner />
                    Thinking through your catalog…
                  </span>
                  <span className="tabular-nums">
                    {controller.matchingProgress.processed.toLocaleString()} /{" "}
                    {controller.matchingProgress.total.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={progressValue}
                  aria-label="Cultivar matching progress"
                />
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full"
              disabled={
                controller.mapping.title === null ||
                controller.matchingProgress !== null
              }
              onClick={onSubmit}
            >
              {controller.matchingProgress
                ? "Building catalog preview…"
                : "Build catalog preview"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
