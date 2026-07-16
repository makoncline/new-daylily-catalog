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
  type PublicCatalogSearchFacetOption,
  type PublicCatalogSearchFacetOptions,
} from "./public-catalog-search-types";

interface PublicCatalogSearchPanelContext<TData> {
  facetOptions: PublicCatalogSearchFacetOptions;
  listOptions: PublicCatalogSearchFacetOption[];
  table: Table<TData>;
}

function getFacetOptions<TData>(
  definition: PublicCatalogSearchFilterDefinition,
  context: PublicCatalogSearchPanelContext<TData>,
): PublicCatalogSearchFacetOption[] {
  return getPublicCatalogSearchFacetOptionsForDefinition(
    definition,
    context.listOptions,
    context.facetOptions,
  );
}

function isBooleanFilterActive<TData>(column: Column<TData, unknown> | null) {
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

function getRangeBounds<TData>(
  table: Table<TData>,
  column: Column<TData, unknown> | null,
) {
  if (!column) {
    return null;
  }

  const values = [];
  for (const row of table.getCoreRowModel().rows) {
    const value = extractNumericValue(row.getValue(column.id));
    if (value !== null) {
      values.push(value);
    }
  }

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

function getRangeValue<TData>(
  column: Column<TData, unknown> | null,
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
      return <Camera className="size-4" />;
    case "dollar":
      return <DollarSign className="size-4" />;
    case "link":
      return <Link2 className="size-4" />;
    default:
      return null;
  }
}

export function PublicCatalogSearchBooleanFilter({
  active,
  label,
  icon,
  onToggle,
  testId,
  tone = "default",
}: {
  active: boolean;
  label: string;
  icon?: "camera" | "dollar" | "link";
  onToggle: () => void;
  testId: string;
  tone?: "default" | "dark";
}) {
  return (
    <Button
      aria-pressed={active}
      data-testid={testId}
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn(
        active && "shadow-sm",
        tone === "dark" &&
          (active
            ? "bg-[#f4c477] text-[#142118] hover:bg-[#eab663] max-sm:h-11 max-sm:px-3"
            : "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white max-sm:h-11 max-sm:px-3"),
      )}
      onClick={onToggle}
    >
      {getFilterIcon(icon)}
      <span>{label}</span>
    </Button>
  );
}

export function PublicCatalogSearchTextFilter({
  label,
  onChange,
  placeholder,
  testId,
  tone = "default",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
  tone?: "default" | "dark";
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label
        className={cn(
          "text-xs font-medium tracking-wide uppercase",
          tone === "dark" && "text-[#f4c477]",
        )}
      >
        {label}
      </Label>
      <Input
        data-testid={testId}
        value={value}
        placeholder={placeholder}
        className={cn(
          tone === "dark" &&
            "border-white/25 bg-[#07120e]/55 text-white shadow-none placeholder:text-white/45 max-sm:h-11",
        )}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export interface PublicCatalogSearchRangeBounds {
  min: number;
  max: number;
  step?: number;
}

export function PublicCatalogSearchRangeFilter({
  bounds,
  label,
  onChange,
  onCommit,
  testId,
  tone = "default",
  unit,
  value,
}: {
  bounds: PublicCatalogSearchRangeBounds;
  label: string;
  onChange: (value: NumericRange) => void;
  onCommit?: (value: NumericRange) => void;
  testId: string;
  tone?: "default" | "dark";
  unit?: string;
  value: NumericRange;
}) {
  const step = bounds.step ?? 1;
  let sliderMin = clampValue(value.min ?? bounds.min, bounds.min, bounds.max);
  let sliderMax = clampValue(value.max ?? bounds.max, bounds.min, bounds.max);

  if (sliderMin > sliderMax) {
    [sliderMin, sliderMax] = [sliderMax, sliderMin];
  }

  const getNextRange = (
    nextMinValue: number,
    nextMaxValue: number,
  ): NumericRange => {
    const nextMin = roundToStep(
      clampValue(nextMinValue, bounds.min, bounds.max),
    );
    const nextMax = roundToStep(
      clampValue(nextMaxValue, bounds.min, bounds.max),
    );
    const min = nextMin <= bounds.min ? null : nextMin;
    const max = nextMax >= bounds.max ? null : nextMax;

    if (min === null && max === null) {
      return { min: null, max: null };
    }

    return { min, max };
  };

  const handleSliderChange = (nextValues: number[]) => {
    const [nextMinValue = bounds.min, nextMaxValue = bounds.max] = nextValues;
    onChange(getNextRange(nextMinValue, nextMaxValue));
  };

  const handleSliderCommit = (nextValues: number[]) => {
    const [nextMinValue = bounds.min, nextMaxValue = bounds.max] = nextValues;
    onCommit?.(getNextRange(nextMinValue, nextMaxValue));
  };

  const handleInputCommit = (which: "min" | "max", raw: string) => {
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    const nextRange =
      which === "min"
        ? getNextRange(parsed, sliderMax)
        : getNextRange(sliderMin, parsed);
    onChange(nextRange);
    onCommit?.(nextRange);
  };

  const displayLabel = unit ? `${label} (${unit})` : label;

  return (
    <div className="w-full max-w-64 space-y-2" data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <Label
          className={cn(
            "text-xs font-medium tracking-wide uppercase",
            tone === "dark" && "text-[#f4c477]",
          )}
        >
          {displayLabel}
        </Label>
        <span
          className={cn(
            "text-muted-foreground text-xs",
            tone === "dark" && "text-white/65",
          )}
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
        step={step}
        minStepsBetweenThumbs={0}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderCommit}
        className={cn(
          "relative flex w-full touch-none items-center select-none",
          tone === "dark" && "max-sm:py-2",
        )}
      >
        <SliderPrimitive.Track
          className={cn(
            "bg-primary/20 relative h-1.5 w-full grow overflow-hidden rounded-full",
            tone === "dark" && "bg-white/20",
          )}
        >
          <SliderPrimitive.Range
            className={cn(
              "bg-primary absolute h-full",
              tone === "dark" && "bg-[#f4c477]",
            )}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-testid={`${testId}-thumb-min`}
          aria-label={`${label} minimum`}
          className={cn(
            "border-primary/50 bg-background focus-visible:ring-ring block size-4 rounded-full border shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
            tone === "dark" && "border-[#f4c477] bg-[#07120e]",
          )}
        />
        <SliderPrimitive.Thumb
          data-testid={`${testId}-thumb-max`}
          aria-label={`${label} maximum`}
          className={cn(
            "border-primary/50 bg-background focus-visible:ring-ring block size-4 rounded-full border shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
            tone === "dark" && "border-[#f4c477] bg-[#07120e]",
          )}
        />
      </SliderPrimitive.Root>

      <div className="flex items-center justify-between gap-2">
        <Input
          type="number"
          data-testid={`${testId}-input-min`}
          aria-label={`${label} minimum`}
          className={cn(
            "h-7 w-20 text-xs tabular-nums",
            tone === "dark" &&
              "border-white/25 bg-[#07120e]/55 text-white shadow-none max-sm:h-10",
          )}
          min={bounds.min}
          max={bounds.max}
          step={step}
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
          className={cn(
            "h-7 w-20 text-right text-xs tabular-nums",
            tone === "dark" &&
              "border-white/25 bg-[#07120e]/55 text-white shadow-none max-sm:h-10",
          )}
          min={bounds.min}
          max={bounds.max}
          step={step}
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

export function PublicCatalogSearchFacetFilter({
  label,
  onChange,
  options,
  testId,
  tone = "default",
  values,
}: {
  label: string;
  onChange: (values: string[]) => void;
  options: PublicCatalogSearchFacetOption[];
  testId: string;
  tone?: "default" | "dark";
  values: string[];
}) {
  return (
    <div data-testid={testId}>
      <DataTableFacetedFilter<unknown>
        title={label}
        options={options}
        values={values}
        onValuesChange={onChange}
        buttonClassName={cn(
          tone === "dark" &&
            "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white max-sm:h-11",
        )}
      />
    </div>
  );
}

export function PublicCatalogSearchFilterControl<TData>({
  definition,
  context,
}: {
  definition: PublicCatalogSearchFilterDefinition;
  context: PublicCatalogSearchPanelContext<TData>;
}) {
  const column = getPublicCatalogSearchFilterColumn(context.table, definition);

  switch (definition.kind) {
    case "boolean": {
      if (!column) return null;
      const active = isBooleanFilterActive(column);
      return (
        <PublicCatalogSearchBooleanFilter
          active={active}
          icon={definition.icon}
          label={definition.label}
          onToggle={() => {
            column.setFilterValue(active ? undefined : true);
            context.table.resetPagination();
          }}
          testId={definition.testId}
        />
      );
    }
    case "text": {
      if (!column) return null;
      const value = column.getFilterValue();
      return (
        <PublicCatalogSearchTextFilter
          label={definition.label}
          value={typeof value === "string" ? value : ""}
          placeholder={
            definition.placeholder ?? `Search ${definition.label.toLowerCase()}`
          }
          onChange={(nextValue) => {
            column.setFilterValue(nextValue.length > 0 ? nextValue : undefined);
            context.table.resetPagination();
          }}
          testId={definition.testId}
        />
      );
    }
    case "range": {
      if (!column) return null;
      const bounds = getRangeBounds(context.table, column);
      if (!bounds) {
        return (
          <div className="w-full max-w-64 space-y-2">
            <Label className="text-xs font-medium tracking-wide uppercase">
              {definition.label}
              {definition.unit ? ` (${definition.unit})` : ""}
            </Label>
            <p className="text-muted-foreground text-xs">No numeric values</p>
          </div>
        );
      }

      return (
        <PublicCatalogSearchRangeFilter
          bounds={bounds}
          label={definition.label}
          value={getRangeValue(column)}
          onChange={(nextValue) => {
            if (nextValue.min === null && nextValue.max === null) {
              column.setFilterValue(undefined);
            } else {
              column.setFilterValue(formatNumericRange(nextValue));
            }
            context.table.resetPagination();
          }}
          testId={definition.testId}
          unit={definition.unit}
        />
      );
    }
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
