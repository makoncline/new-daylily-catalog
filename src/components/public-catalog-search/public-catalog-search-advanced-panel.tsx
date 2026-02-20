"use client";

import { type Column, type Table } from "@tanstack/react-table";
import * as SliderPrimitive from "@radix-ui/react-slider";
import {
  Camera,
  DollarSign,
  Link2,
  PanelLeftClose,
  Search,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  extractNumericValue,
  formatNumericRange,
  parseNumericRange,
  type NumericRange,
} from "./public-catalog-search-filter-utils";
import {
  type PublicCatalogSearchFacetOption,
  type PublicCatalogListing,
  type PublicCatalogSearchAdvancedPanelProps,
} from "./public-catalog-search-types";

interface RangeFilterControlProps {
  table: Table<PublicCatalogListing>;
  column: Column<PublicCatalogListing, unknown> | null;
  label: string;
  testId: string;
  unit?: string;
}

interface TextFilterControlProps {
  table: Table<PublicCatalogListing>;
  column: Column<PublicCatalogListing, unknown> | null;
  label: string;
  placeholder: string;
  testId: string;
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

function TextFilterControl({
  table,
  column,
  label,
  placeholder,
  testId,
}: TextFilterControlProps) {
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
  table,
  column,
  label,
  testId,
  unit,
}: RangeFilterControlProps) {
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

function isColumnFiltered(
  column: Column<PublicCatalogListing, unknown> | null,
) {
  if (!column) return false;
  const v = column.getFilterValue();
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && v.length === 0) return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function countActiveFilters(
  columns: (Column<PublicCatalogListing, unknown> | null)[],
): number {
  return columns.filter(isColumnFiltered).length;
}

function BooleanFilterToggle({
  table,
  column,
  label,
  icon,
  testId,
}: {
  table: Table<PublicCatalogListing>;
  column: Column<PublicCatalogListing, unknown> | null;
  label: string;
  icon: ReactNode;
  testId: string;
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
      {icon}
      <span>{label}</span>
    </Button>
  );
}

const COLUMN_DISPLAY_NAMES: Record<string, string> = {
  title: "Title",
  description: "Description",
  priceValue: "Price",
  cultivarName: "Cultivar",
  linkedToCultivar: "Linked to Cultivar",
  price: "For Sale",
  hasPhoto: "Has Photo",
  lists: "Lists",
  hybridizer: "Hybridizer",
  year: "Year",
  bloomHabit: "Bloom Habit",
  bloomSeason: "Bloom Season",
  scapeHeight: "Scape Height",
  bloomSize: "Bloom Size",
  budcount: "Bud Count",
  branches: "Branches",
  form: "Form",
  ploidy: "Ploidy",
  foliageType: "Foliage Type",
  fragrance: "Fragrance",
  color: "Color",
  parentage: "Parentage",
};

interface FilterChip {
  id: string;
  label: string;
  onClear: () => void;
}

function buildFilterChips(
  table: Table<PublicCatalogListing>,
  facetLabels: Record<string, Map<string, string>>,
): FilterChip[] {
  const chips: FilterChip[] = [];
  const globalFilter: unknown = table.getState().globalFilter;

  if (typeof globalFilter === "string" && globalFilter.length > 0) {
    chips.push({
      id: "global",
      label: `Search: ${globalFilter}`,
      onClear: () => {
        table.setGlobalFilter("");
        table.resetPageIndex(true);
      },
    });
  }

  for (const { id, value } of table.getState().columnFilters) {
    const column = table.getColumn(id);
    if (!column) continue;

    const displayName = COLUMN_DISPLAY_NAMES[id] ?? id;
    let summary: string;

    if (value === true || value === "true" || value === "1") {
      summary = displayName;
    } else if (typeof value === "string") {
      const range = parseNumericRange(value);
      if (range) {
        const parts: string[] = [];
        if (range.min !== null) parts.push(formatRangeNumber(range.min));
        if (range.max !== null) parts.push(formatRangeNumber(range.max));
        summary = `${displayName}: ${parts.join(" - ")}`;
      } else {
        summary = `${displayName}: ${value}`;
      }
    } else if (Array.isArray(value)) {
      const ids = value as string[];
      const labelMap = facetLabels[id];
      if (ids.length === 1) {
        const name = labelMap?.get(ids[0]!) ?? ids[0]!;
        summary = `${displayName}: ${name.length > 35 ? `${name.slice(0, 20)}…${name.slice(-10)}` : name}`;
      } else {
        summary = `${displayName}: ${ids.length} selected`;
      }
    } else {
      summary = displayName;
    }

    chips.push({
      id,
      label: summary,
      onClear: () => {
        column.setFilterValue(undefined);
        table.resetPagination();
      },
    });
  }

  return chips;
}

function ActiveFilterChips({
  table,
  listOptions,
}: {
  table: Table<PublicCatalogListing>;
  listOptions: PublicCatalogSearchFacetOption[];
}) {
  const facetLabels: Record<string, Map<string, string>> = {
    lists: new Map(listOptions.map((o) => [o.value, o.label])),
  };
  const chips = buildFilterChips(table, facetLabels);
  if (chips.length === 0) return null;

  return (
    <div className="mb-3 space-y-2" data-testid="active-filter-chips">
      <div className="flex flex-wrap items-center gap-2">
        <DataTableFilteredCount table={table} />
        <DataTableFilterReset table={table} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <Button
            key={chip.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-6 gap-1 rounded-full px-2 text-xs"
            onClick={chip.onClear}
          >
            {chip.label}
            <X className="h-3 w-3" />
          </Button>
        ))}
      </div>
    </div>
  );
}

function BasicSearchInput({
  table,
  onSubmit,
}: {
  table: Table<PublicCatalogListing>;
  onSubmit?: () => void;
}) {
  const globalFilter: unknown = table.getState().globalFilter;
  const [value, setValue] = useState(
    typeof globalFilter === "string" ? globalFilter : "",
  );

  const debouncedFilter = useDebouncedCallback((next: string) => {
    table.setGlobalFilter(next);
    if (next) {
      table.setSorting([{ id: "title", desc: false }]);
    }
    table.resetPageIndex(true);
  }, 200);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        debouncedFilter.flush();
        onSubmit?.();
      }}
      data-testid="search-query-form"
    >
      <Input
        placeholder="Search listings..."
        value={value}
        className="h-9"
        data-testid="search-all-fields-input"
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          debouncedFilter(next);
        }}
      />
    </form>
  );
}

export function PublicCatalogSearchAdvancedPanel({
  table,
  listOptions,
  facetOptions,
  mode,
  onModeChange,
  collapsed,
  onCollapsedChange,
  onSearchSubmit,
}: PublicCatalogSearchAdvancedPanelProps) {
  const isAdvanced = mode === "advanced";
  const listsColumn = table.getColumn("lists") ?? null;
  const priceColumn = table.getColumn("price") ?? null;
  const hasPhotoColumn = table.getColumn("hasPhoto") ?? null;
  const titleColumn = table.getColumn("title") ?? null;
  const descriptionColumn = table.getColumn("description") ?? null;
  const priceValueColumn = table.getColumn("priceValue") ?? null;
  const cultivarNameColumn = table.getColumn("cultivarName") ?? null;
  const linkedToCultivarColumn = table.getColumn("linkedToCultivar") ?? null;
  const hybridizerColumn = table.getColumn("hybridizer") ?? null;
  const yearColumn = table.getColumn("year") ?? null;
  const bloomHabitColumn = table.getColumn("bloomHabit") ?? null;
  const bloomSeasonColumn = table.getColumn("bloomSeason") ?? null;
  const scapeHeightColumn = table.getColumn("scapeHeight") ?? null;
  const bloomSizeColumn = table.getColumn("bloomSize") ?? null;
  const budcountColumn = table.getColumn("budcount") ?? null;
  const branchesColumn = table.getColumn("branches") ?? null;
  const formColumn = table.getColumn("form") ?? null;
  const ploidyColumn = table.getColumn("ploidy") ?? null;
  const foliageTypeColumn = table.getColumn("foliageType") ?? null;
  const fragranceColumn = table.getColumn("fragrance") ?? null;
  const colorColumn = table.getColumn("color") ?? null;
  const parentageColumn = table.getColumn("parentage") ?? null;

  if (collapsed) {
    return (
      <div
        data-testid="advanced-search-panel"
        className="bg-muted/10 flex items-center justify-center rounded-lg border p-2"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onCollapsedChange(false)}
          data-testid="search-panel-expand"
        >
          <Search className="h-4 w-4" />
          <span className="sr-only">Expand search panel</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      id="lists"
      className="bg-muted/10 rounded-lg border p-3 md:p-4"
      data-testid="advanced-search-panel"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCollapsedChange(true)}
            data-testid="search-panel-collapse"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
            <span className="sr-only">Collapse search panel</span>
          </Button>
          <span className="text-sm font-semibold">Search</span>
        </div>
        <label
          className="flex items-center gap-2"
          data-testid="search-mode-toggle"
        >
          <span className="text-muted-foreground text-xs">Advanced</span>
          <Switch
            checked={isAdvanced}
            onCheckedChange={(checked) =>
              onModeChange(checked ? "advanced" : "basic")
            }
            data-testid="search-mode-switch"
          />
        </label>
      </div>

      <ActiveFilterChips table={table} listOptions={listOptions} />

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <Search className="h-3 w-3" />
            Filters apply live
          </span>
        </div>
        <BasicSearchInput table={table} onSubmit={onSearchSubmit} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <BooleanFilterToggle
          table={table}
          column={priceColumn}
          label="For Sale"
          icon={<DollarSign className="h-4 w-4" />}
          testId="advanced-filter-for-sale"
        />
        <BooleanFilterToggle
          table={table}
          column={hasPhotoColumn}
          label="Has Photo"
          icon={<Camera className="h-4 w-4" />}
          testId="advanced-filter-has-photo"
        />
        <div data-testid="advanced-filter-lists">
          {listsColumn ? (
            <DataTableFacetedFilter
              column={listsColumn}
              title="Lists"
              options={listOptions}
              table={table}
            />
          ) : null}
        </div>
      </div>

      {isAdvanced && (
        <Accordion
          type="multiple"
          defaultValue={["listing"]}
          className="mt-4 space-y-1"
        >
          <AccordionItem value="listing">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                Listing
                {countActiveFilters([
                  titleColumn,
                  descriptionColumn,
                  priceValueColumn,
                  linkedToCultivarColumn,
                ]) > 0 && (
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {countActiveFilters([
                      titleColumn,
                      descriptionColumn,
                      priceValueColumn,
                      linkedToCultivarColumn,
                    ])}
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <TextFilterControl
                  table={table}
                  column={titleColumn}
                  label="Title"
                  placeholder="Search listing title"
                  testId="advanced-filter-title"
                />
                <TextFilterControl
                  table={table}
                  column={descriptionColumn}
                  label="Description"
                  placeholder="Search description"
                  testId="advanced-filter-description"
                />
                <RangeFilterControl
                  table={table}
                  column={priceValueColumn}
                  label="Price"
                  unit="$"
                  testId="advanced-filter-price-range"
                />
                <BooleanFilterToggle
                  table={table}
                  column={linkedToCultivarColumn}
                  label="Linked to Cultivar"
                  icon={<Link2 className="h-4 w-4" />}
                  testId="advanced-filter-linked-to-cultivar"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="registration">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                Registration
                {countActiveFilters([
                  cultivarNameColumn,
                  hybridizerColumn,
                  yearColumn,
                ]) > 0 && (
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {countActiveFilters([
                      cultivarNameColumn,
                      hybridizerColumn,
                      yearColumn,
                    ])}
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <TextFilterControl
                  table={table}
                  column={cultivarNameColumn}
                  label="Cultivar"
                  placeholder="Search cultivar name"
                  testId="advanced-filter-cultivar-name"
                />
                <TextFilterControl
                  table={table}
                  column={hybridizerColumn}
                  label="Hybridizer"
                  placeholder="Search hybridizer"
                  testId="advanced-filter-hybridizer"
                />
                <RangeFilterControl
                  table={table}
                  column={yearColumn}
                  label="Year"
                  testId="advanced-filter-year"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="traits">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                Bloom Traits
                {countActiveFilters([
                  bloomHabitColumn,
                  bloomSeasonColumn,
                  scapeHeightColumn,
                  bloomSizeColumn,
                  budcountColumn,
                  branchesColumn,
                ]) > 0 && (
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {countActiveFilters([
                      bloomHabitColumn,
                      bloomSeasonColumn,
                      scapeHeightColumn,
                      bloomSizeColumn,
                      budcountColumn,
                      branchesColumn,
                    ])}
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <div data-testid="advanced-filter-bloom-habit">
                    {bloomHabitColumn ? (
                      <DataTableFacetedFilter
                        column={bloomHabitColumn}
                        title="Bloom Habit"
                        options={facetOptions.bloomHabit}
                        table={table}
                      />
                    ) : null}
                  </div>
                  <div data-testid="advanced-filter-bloom-season">
                    {bloomSeasonColumn ? (
                      <DataTableFacetedFilter
                        column={bloomSeasonColumn}
                        title="Bloom Season"
                        options={facetOptions.bloomSeason}
                        table={table}
                      />
                    ) : null}
                  </div>
                </div>

                <RangeFilterControl
                  table={table}
                  column={scapeHeightColumn}
                  label="Scape Height"
                  unit="in."
                  testId="advanced-filter-scape-height"
                />

                <RangeFilterControl
                  table={table}
                  column={bloomSizeColumn}
                  label="Bloom Size"
                  unit="in."
                  testId="advanced-filter-bloom-size"
                />

                <RangeFilterControl
                  table={table}
                  column={budcountColumn}
                  label="Bud Count"
                  testId="advanced-filter-budcount"
                />

                <RangeFilterControl
                  table={table}
                  column={branchesColumn}
                  label="Branches"
                  testId="advanced-filter-branches"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                Classification & Details
                {countActiveFilters([
                  formColumn,
                  ploidyColumn,
                  foliageTypeColumn,
                  fragranceColumn,
                  colorColumn,
                  parentageColumn,
                ]) > 0 && (
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {countActiveFilters([
                      formColumn,
                      ploidyColumn,
                      foliageTypeColumn,
                      fragranceColumn,
                      colorColumn,
                      parentageColumn,
                    ])}
                  </Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <div data-testid="advanced-filter-form">
                    {formColumn ? (
                      <DataTableFacetedFilter
                        column={formColumn}
                        title="Form"
                        options={facetOptions.form}
                        table={table}
                      />
                    ) : null}
                  </div>
                  <div data-testid="advanced-filter-ploidy">
                    {ploidyColumn ? (
                      <DataTableFacetedFilter
                        column={ploidyColumn}
                        title="Ploidy"
                        options={facetOptions.ploidy}
                        table={table}
                      />
                    ) : null}
                  </div>
                  <div data-testid="advanced-filter-foliage-type">
                    {foliageTypeColumn ? (
                      <DataTableFacetedFilter
                        column={foliageTypeColumn}
                        title="Foliage Type"
                        options={facetOptions.foliageType}
                        table={table}
                      />
                    ) : null}
                  </div>
                  <div data-testid="advanced-filter-fragrance">
                    {fragranceColumn ? (
                      <DataTableFacetedFilter
                        column={fragranceColumn}
                        title="Fragrance"
                        options={facetOptions.fragrance}
                        table={table}
                      />
                    ) : null}
                  </div>
                </div>

                <TextFilterControl
                  table={table}
                  column={colorColumn}
                  label="Color"
                  placeholder="Search color notes"
                  testId="advanced-filter-color"
                />

                <TextFilterControl
                  table={table}
                  column={parentageColumn}
                  label="Parentage"
                  placeholder="Search parentage"
                  testId="advanced-filter-parentage"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
