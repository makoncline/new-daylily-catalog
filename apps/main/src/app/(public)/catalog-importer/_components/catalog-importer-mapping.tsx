"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  FieldDescription,
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
}

function MappingField({
  controller,
  definition,
}: {
  controller: CatalogImporterWorkbenchController;
  definition: CatalogImporterMappingFieldDefinition;
}) {
  const selectId = `catalog-importer-map-${definition.field}`;
  const descriptionId = `${selectId}-description`;
  const value = controller.mapping[definition.field];

  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={selectId}>
        {definition.label}
        {definition.required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </FieldLabel>
      <FieldContent>
        <Select
          value={value === null ? "none" : String(value)}
          onValueChange={(nextValue) =>
            controller.handleMappingChange(
              definition.field,
              nextValue === "none" ? null : Number(nextValue),
            )
          }
        >
          <SelectTrigger id={selectId} aria-describedby={descriptionId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="none">
                {definition.required ? "Select a column" : "Do not import"}
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
        <FieldDescription id={descriptionId}>
          {definition.description}
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}

function SpreadsheetPreview({ controller }: CatalogImporterMappingProps) {
  const [open, setOpen] = useState(true);

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
                    {Array.from(
                      { length: controller.sourcePreviewColumnCount },
                      (_, columnIndex) => (
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
                      {Array.from(
                        { length: controller.sourcePreviewColumnCount },
                        (_, columnIndex) => (
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
          <SpreadsheetPreview controller={controller} />
        </div>

        <Card className="order-1 shadow-sm lg:order-2">
          <CardHeader>
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
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-5">
              <Field className="gap-2">
                <FieldLabel htmlFor="catalog-importer-header-row">
                  Header row
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={
                      controller.headerRowIndex === null
                        ? "none"
                        : String(controller.headerRowIndex)
                    }
                    onValueChange={controller.handleHeaderChange}
                  >
                    <SelectTrigger
                      id="catalog-importer-header-row"
                      aria-describedby="catalog-importer-header-description"
                    >
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
                            <SelectItem key={rowIndex} value={String(rowIndex)}>
                              {getHeaderRowSummary(row, rowIndex)}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription id="catalog-importer-header-description">
                    Pick the row that contains labels such as Name, Price, or
                    Description.
                  </FieldDescription>
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
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {controller.draftRows.length.toLocaleString()} rows
            </Badge>
            {controller.skippedCount > 0 ? (
              <Badge variant="outline">
                {controller.skippedCount.toLocaleString()} omitted
              </Badge>
            ) : null}
            {controller.duplicateCount > 0 ? (
              <Badge variant="outline">
                {controller.duplicateCount.toLocaleString()} duplicates
              </Badge>
            ) : null}
            {controller.warningCount > 0 ? (
              <Badge variant="outline">
                {controller.warningCount.toLocaleString()} values need review
              </Badge>
            ) : null}
          </div>

          {controller.matchingProgress ? (
            <div className="min-w-0 space-y-2 lg:w-80">
              <div className="text-muted-foreground flex items-center justify-between gap-4 text-xs">
                <span className="flex items-center gap-2">
                  <Spinner />
                  Checking cultivar names
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
          ) : controller.matchedRows ? (
            <p className="text-muted-foreground text-sm">
              {controller.mode === "public"
                ? `${controller.matchedRows.length.toLocaleString()} confident matches ready`
                : "Matching complete. Review uncertain names below."}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
