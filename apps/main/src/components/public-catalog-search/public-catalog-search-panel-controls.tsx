"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { type Column, type Table } from "@tanstack/react-table";
import { Camera, DollarSign, Link2 } from "lucide-react";
import { type ReactNode } from "react";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  extractNumericValue,
  formatNumericRange,
  parseNumericRange,
  type NumericRange,
} from "./public-catalog-search-filter-utils";
import {
  getPublicCatalogSearchFacetOptionsForDefinition,
  getPublicCatalogSearchFilterColumn,
  type PublicCatalogSearchFilterDefinition,
  type PublicCatalogSearchSectionDefinition,
} from "./public-catalog-search-registry";
import {
  type PublicCatalogListing,
  type PublicCatalogSearchFacetOption,
  type PublicCatalogSearchFacetOptions,
} from "./public-catalog-search-types";

interface PublicCatalogSearchPanelContext {
  facetOptions: PublicCatalogSearchFacetOptions;
  listOptions: PublicCatalogSearchFacetOption[];
  table: Table<PublicCatalogListing>;
}

function getFacetOptions(
  definition: PublicCatalogSearchFilterDefinition,
  context: PublicCatalogSearchPanelContext,
): PublicCatalogSearchFacetOption[] {
  return getPublicCatalogSearchFacetOptionsForDefinition(
    definition,
    context.listOptions,
    context.facetOptions,
  );
}

function isBooleanFilterActive(
  column: Column<PublicCatalogListing, unknown> | null,
) {
  if (!column) {
    return false;
  }

  const value = column.getFilterValue();
  return value === true || value === "true" || value === "1";
}

function formatRangeNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(1)));
}

function getRangeBounds(
  table: Table<PublicCatalogListing>,
  column: Column<PublicCatalogListing, unknown> | null,
) {
  if (!column) {
    return null;
  }

  const values = table
    .getCoreRowModel()
    .rows.map((row) => extractNumericValue(row.getValue(column.id)))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  const min = Math.floor(Math.min(...values));
  const max = Math.ceil(Math.max(...values));

  return { min, max, step: 1 };
}

function clampValue(value: number, min: number, max: number) {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function roundToStep(value: number) {
  return Math.round(value);
}

function getRangeValue(
  column: Column<PublicCatalogListing, unknown> | null,
): NumericRange {
  const parsed = parseNumericRange(column?.getFilterValue());

  return (
    parsed ?? {
      min: null,
      max: null,
    }
  );
}

function getFilterIcon(kind: "camera" | "dollar" | "link" | undefined) {
  switch (kind) {
    case "camera":
      return <Camera className="h-4 w-4" />;
    case "dollar":
      return <DollarSign className="h-4 w-4" />;
    case "link":
      return <Link2 className="h-4 w-4" />;
    default:
      return null;
  }
}

function BooleanFilterToggle({
  column,
  label,
  icon,
  testId,
  table,
}: {
  column: Column<PublicCatalogListing, unknown> | null;
  label: string;
  icon?: "camera" | "dollar" | "link";
  testId: string;
  table: Table<PublicCatalogListing>;
}) {
  if (!column) {
    return null;
  }

  const active = isBooleanFilterActive(column);

  return (
    <Button
      data-testid={testId}
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn(active && "shadow-sm")}
      onClick={() => {
        column.setFilterValue(active ? undefined : true);
        table.resetPagination();
      }}
    >
      {getFilterIcon(icon)}
      <span>{label}</span>
    </Button>
  );
}

function TextFilterControl({
  column,
  label,
  placeholder,
  table,
  testId,
}: {
  column: Column<PublicCatalogListing, unknown> | null;
  label: string;
  placeholder: string;
  table: Table<PublicCatalogListing>;
  testId: string;
}) {
  if (!column) {
    return null;
  }

  const value = column.getFilterValue();
  const inputValue = typeof value === "string" ? value : "";

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium tracking-wide uppercase">
        {label}
      </Label>
      <Input
        data-testid={testId}
        value={inputValue}
        placeholder={placeholder}
        onChange={(event) => {
          const nextValue = event.target.value;
          column.setFilterValue(nextValue.length > 0 ? nextValue : undefined);
          table.resetPagination();
        }}
      />
    </div>
  );
}

function RangeFilterControl({
  column,
  label,
  table,
  testId,
  unit,
}: {
  column: Column<PublicCatalogListing, unknown> | null;
  label: string;
  table: Table<PublicCatalogListing>;
  testId: string;
  unit?: string;
}) {
  if (!column) {
    return null;
  }

  const bounds = getRangeBounds(table, column);
  if (!bounds) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium tracking-wide uppercase">
          {label}
          {unit ? ` (${unit})` : ""}
        </Label>
        <p className="text-muted-foreground text-xs">No numeric values</p>
      </div>
    );
  }

  const range = getRangeValue(column);
  let sliderMin = clampValue(range.min ?? bounds.min, bounds.min, bounds.max);
  let sliderMax = clampValue(range.max ?? bounds.max, bounds.min, bounds.max);

  if (sliderMin > sliderMax) {
    [sliderMin, sliderMax] = [sliderMax, sliderMin];
  }

  const commitRange = (nextMinValue: number, nextMaxValue: number) => {
    const nextMin = roundToStep(
      clampValue(nextMinValue, bounds.min, bounds.max),
    );
    const nextMax = roundToStep(
      clampValue(nextMaxValue, bounds.min, bounds.max),
    );
    const min = nextMin <= bounds.min ? null : nextMin;
    const max = nextMax >= bounds.max ? null : nextMax;

    if (min === null && max === null) {
      column.setFilterValue(undefined);
      table.resetPagination();
      return;
    }

    column.setFilterValue(formatNumericRange({ min, max }));
    table.resetPagination();
  };

  const handleSliderChange = (nextValues: number[]) => {
    const [nextMinValue = bounds.min, nextMaxValue = bounds.max] = nextValues;
    commitRange(nextMinValue, nextMaxValue);
  };

  const handleInputCommit = (which: "min" | "max", raw: string) => {
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    if (which === "min") {
      commitRange(parsed, sliderMax);
    } else {
      commitRange(sliderMin, parsed);
    }
  };

  const displayLabel = unit ? `${label} (${unit})` : label;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium tracking-wide uppercase">
          {displayLabel}
        </Label>
        <span
          className="text-muted-foreground text-xs"
          data-testid={`${testId}-value`}
        >
          {formatRangeNumber(sliderMin)} - {formatRangeNumber(sliderMax)}
        </span>
      </div>

      <SliderPrimitive.Root
        data-testid={`${testId}-slider`}
        value={[sliderMin, sliderMax]}
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        minStepsBetweenThumbs={0}
        onValueChange={handleSliderChange}
        className="relative flex w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track className="bg-primary/20 relative h-1.5 w-full grow overflow-hidden rounded-full">
          <SliderPrimitive.Range className="bg-primary absolute h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-testid={`${testId}-thumb-min`}
          aria-label={`${label} minimum`}
          className="border-primary/50 bg-background focus-visible:ring-ring block h-4 w-4 rounded-full border shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        />
        <SliderPrimitive.Thumb
          data-testid={`${testId}-thumb-max`}
          aria-label={`${label} maximum`}
          className="border-primary/50 bg-background focus-visible:ring-ring block h-4 w-4 rounded-full border shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderPrimitive.Root>

      <div className="flex items-center justify-between gap-2">
        <Input
          type="number"
          data-testid={`${testId}-input-min`}
          aria-label={`${label} minimum`}
          className="h-7 w-20 text-xs tabular-nums"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={formatRangeNumber(sliderMin)}
          onChange={() => undefined}
          onBlur={(e) => handleInputCommit("min", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleInputCommit("min", e.currentTarget.value);
            }
          }}
        />
        <Input
          type="number"
          data-testid={`${testId}-input-max`}
          aria-label={`${label} maximum`}
          className="h-7 w-20 text-right text-xs tabular-nums"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={formatRangeNumber(sliderMax)}
          onChange={() => undefined}
          onBlur={(e) => handleInputCommit("max", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleInputCommit("max", e.currentTarget.value);
            }
          }}
        />
      </div>
    </div>
  );
}

export function PublicCatalogSearchFilterControl({
  definition,
  context,
}: {
  definition: PublicCatalogSearchFilterDefinition;
  context: PublicCatalogSearchPanelContext;
}) {
  const column = getPublicCatalogSearchFilterColumn(context.table, definition);

  switch (definition.kind) {
    case "boolean":
      return (
        <BooleanFilterToggle
          column={column}
          icon={definition.icon}
          label={definition.label}
          testId={definition.testId}
          table={context.table}
        />
      );
    case "text":
      return (
        <TextFilterControl
          column={column}
          label={definition.label}
          placeholder={definition.placeholder ?? `Search ${definition.label.toLowerCase()}`}
          table={context.table}
          testId={definition.testId}
        />
      );
    case "range":
      return (
        <RangeFilterControl
          column={column}
          label={definition.label}
          table={context.table}
          testId={definition.testId}
          unit={definition.unit}
        />
      );
    case "facet": {
      return (
        <div data-testid={definition.testId}>
          {column ? (
            <DataTableFacetedFilter
              column={column}
              title={definition.label}
              options={getFacetOptions(definition, context)}
              table={context.table}
            />
          ) : null}
        </div>
      );
    }
    default:
      return null;
  }
}

export function PublicCatalogSearchFilterSection({
  children,
  className,
  count,
  definition,
}: {
  children: ReactNode;
  className?: string;
  count: number;
  definition: PublicCatalogSearchSectionDefinition;
}) {
  return (
    <AccordionItem value={definition.id} className={className}>
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          {definition.label}
          {count > 0 ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {count}
            </Badge>
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}
