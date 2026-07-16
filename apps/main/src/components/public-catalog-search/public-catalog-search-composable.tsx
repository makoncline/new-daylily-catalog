"use client";

import { type Table } from "@tanstack/react-table";
import { Eye, Search, X } from "lucide-react";
import { type ReactNode } from "react";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { InlineCode } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { resetTableState } from "@/lib/table-utils";
import { cn } from "@/lib/utils";
import {
  formatPublicCatalogSearchFilterSummary,
  getPublicCatalogSearchFilterDefinition,
  type PublicCatalogSearchFilterDefinition,
} from "./public-catalog-search-registry";
import { PublicCatalogSearchFilterControl } from "./public-catalog-search-panel-controls";
import {
  type PublicCatalogSearchFacetOption,
  type PublicCatalogSearchFacetOptions,
} from "./public-catalog-search-types";

export interface PublicCatalogSearchFilterChip {
  id: string;
  label: string;
  onClear: () => void;
}

export interface PublicCatalogSearchComposerContext<TData> {
  facetOptions: PublicCatalogSearchFacetOptions;
  listOptions: PublicCatalogSearchFacetOption[];
  table: Table<TData>;
}

function buildFilterChips<TData>(
  table: Table<TData>,
  listOptions: PublicCatalogSearchFacetOption[],
): PublicCatalogSearchFilterChip[] {
  const chips: PublicCatalogSearchFilterChip[] = [];
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

    const summary = formatPublicCatalogSearchFilterSummary({
      definition: getPublicCatalogSearchFilterDefinition(id),
      listOptions,
      value,
    });

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

export function PublicCatalogSearchResultCount<TData>({
  table,
}: {
  table: Table<TData>;
}) {
  const filteredRowsCount = table.getFilteredRowModel().rows.length;
  const totalRowsCount = table.getCoreRowModel().rows.length;
  const resultLabel =
    filteredRowsCount === totalRowsCount
      ? `${totalRowsCount.toLocaleString()} results`
      : `${filteredRowsCount.toLocaleString()} / ${totalRowsCount.toLocaleString()} results`;

  return (
    <InlineCode className="text-muted-foreground text-xs">
      <div
        className="flex items-center gap-2 whitespace-nowrap"
        data-testid="search-results-count"
      >
        <Eye className="text-muted-foreground size-3.5" />
        {resultLabel}
      </div>
    </InlineCode>
  );
}

export function PublicCatalogSearchResetButton<TData>({
  table,
}: {
  table: Table<TData>;
}) {
  const state = table.getState();
  const isFiltered =
    state.columnFilters.length > 0 || Boolean(state.globalFilter);

  if (!isFiltered) return null;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => resetTableState(table)}
      size="sm"
      className="h-6 gap-1 rounded-full px-2 text-xs"
    >
      Reset
      <X className="size-3" />
    </Button>
  );
}

export function PublicCatalogSearchFilterChips<TData>({
  className,
  table,
  listOptions,
}: {
  className?: string;
  table: Table<TData>;
  listOptions: PublicCatalogSearchFacetOption[];
}) {
  const chips = buildFilterChips(table, listOptions);

  return (
    <PublicCatalogSearchFilterChipList chips={chips} className={className} />
  );
}

export function PublicCatalogSearchFilterChipList({
  buttonClassName,
  chips,
  className,
}: {
  buttonClassName?: string;
  chips: PublicCatalogSearchFilterChip[];
  className?: string;
}) {
  if (chips.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      data-testid="active-filter-chips"
    >
      {chips.map((chip) => (
        <Button
          key={chip.id}
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-6 gap-1 rounded-full px-2 text-xs", buttonClassName)}
          onClick={chip.onClear}
        >
          {chip.label}
          <X className="size-3" />
        </Button>
      ))}
    </div>
  );
}

export function PublicCatalogSearchActiveFilterChips<TData>({
  alwaysShowSummary = false,
  className,
  table,
  listOptions,
}: {
  alwaysShowSummary?: boolean;
  className?: string;
  table: Table<TData>;
  listOptions: PublicCatalogSearchFacetOption[];
}) {
  const chips = buildFilterChips(table, listOptions);

  if (chips.length === 0 && !alwaysShowSummary) return null;

  return (
    <div
      className={cn("space-y-2", className)}
      data-testid="active-filter-chips"
    >
      <div className="flex flex-wrap items-center gap-2">
        {alwaysShowSummary ? (
          <PublicCatalogSearchResultCount table={table} />
        ) : (
          <DataTableFilteredCount table={table} />
        )}
        <DataTableFilterReset table={table} />
      </div>

      {chips.length > 0 ? (
        <PublicCatalogSearchFilterChips
          table={table}
          listOptions={listOptions}
        />
      ) : null}
    </div>
  );
}

export function PublicCatalogSearchQueryField<TData>({
  className,
  inputClassName,
  onSubmit,
  table,
}: {
  className?: string;
  inputClassName?: string;
  onSubmit?: () => void;
  table: Table<TData>;
}) {
  const globalFilter: unknown = table.getState().globalFilter;
  const currentGlobalFilter =
    typeof globalFilter === "string" ? globalFilter : "";
  const updateFilter = (next: string) => {
    table.setGlobalFilter(next);
    if (next) {
      table.setSorting([{ id: "title", desc: false }]);
    }
    table.resetPageIndex(true);
  };

  return (
    <PublicCatalogSearchQueryInput
      className={className}
      inputClassName={inputClassName}
      onChange={updateFilter}
      onSubmit={onSubmit}
      placeholder="Search listings..."
      value={currentGlobalFilter}
    />
  );
}

export function PublicCatalogSearchQueryInput({
  className,
  inputClassName,
  onChange,
  onSubmit,
  placeholder,
  value,
}: {
  className?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className={className} data-testid="search-query-form">
      <Input
        placeholder={placeholder}
        value={value}
        className={cn("h-9", inputClassName)}
        data-testid="search-all-fields-input"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmit?.();
        }}
      />
    </div>
  );
}

export function PublicCatalogSearchModeToggle({
  checked,
  id,
  onCheckedChange,
}: {
  checked: boolean;
  id: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="grid grid-rows-[auto_2rem] justify-items-center gap-1"
      data-testid="search-mode-toggle"
    >
      <span className="text-xs font-medium tracking-wide uppercase">
        Advanced
      </span>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        data-testid="search-mode-switch"
      />
    </label>
  );
}

export function PublicCatalogSearchFilterField<TData>({
  context,
  definition,
}: {
  context: PublicCatalogSearchComposerContext<TData>;
  definition: PublicCatalogSearchFilterDefinition;
}) {
  return (
    <PublicCatalogSearchFilterControl
      definition={definition}
      context={context}
    />
  );
}

export function PublicCatalogSearchFilterFields<TData>({
  className,
  context,
  definitions,
}: {
  className?: string;
  context: PublicCatalogSearchComposerContext<TData>;
  definitions: PublicCatalogSearchFilterDefinition[];
}) {
  return (
    <div className={className}>
      {definitions.map((definition) => (
        <PublicCatalogSearchFilterField
          key={definition.id}
          definition={definition}
          context={context}
        />
      ))}
    </div>
  );
}

export function PublicCatalogSearchSection({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
        <Search className="size-3" />
        {title}
      </div>
      {children}
    </section>
  );
}
