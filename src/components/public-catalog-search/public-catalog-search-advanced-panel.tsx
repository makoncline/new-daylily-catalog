"use client";

import { type Table } from "@tanstack/react-table";
import { PanelLeftClose, Search, X } from "lucide-react";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  countPublicCatalogSearchSectionFilters,
  formatPublicCatalogSearchFilterSummary,
  PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS,
  PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS,
  getPublicCatalogSearchFilterDefinition,
} from "./public-catalog-search-registry";
import {
  PublicCatalogSearchFilterControl,
  PublicCatalogSearchFilterSection,
} from "./public-catalog-search-panel-controls";
import {
  type PublicCatalogSearchAdvancedPanelProps,
  type PublicCatalogSearchFacetOption,
  type PublicCatalogListing,
} from "./public-catalog-search-types";

interface FilterChip {
  id: string;
  label: string;
  onClear: () => void;
}

function buildFilterChips(
  table: Table<PublicCatalogListing>,
  listOptions: PublicCatalogSearchFacetOption[],
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

function ActiveFilterChips({
  table,
  listOptions,
}: {
  table: Table<PublicCatalogListing>;
  listOptions: PublicCatalogSearchFacetOption[];
}) {
  const chips = buildFilterChips(table, listOptions);
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

function getSectionGroupFilters(
  section: (typeof PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS)[number],
  filterIds: string[],
) {
  type SectionFilter = (typeof section.filters)[number];

  return filterIds
    .map((filterId) => section.filters.find((filter) => filter.id === filterId))
    .filter((filter): filter is SectionFilter => filter !== undefined);
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
  const panelContext = { table, listOptions, facetOptions };

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
        {PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS.map((definition) => (
          <PublicCatalogSearchFilterControl
            key={definition.id}
            definition={definition}
            context={panelContext}
          />
        ))}
      </div>

      {isAdvanced ? (
        <Accordion
          type="multiple"
          defaultValue={["listing"]}
          className="mt-4 space-y-1"
        >
          {PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS.map((section) => (
            <PublicCatalogSearchFilterSection
              key={section.id}
              definition={section}
              count={countPublicCatalogSearchSectionFilters(table, section.id)}
              className={cn(section.id === "details" && "border-b-0")}
            >
              <div className="space-y-4">
                {section.groups.map((group) => {
                  const groupFilters = getSectionGroupFilters(
                    section,
                    group.filterIds,
                  );

                  if (groupFilters.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={group.filterIds.join("-")}
                      className={cn(group.className ?? "space-y-4")}
                    >
                      {groupFilters.map((definition) => (
                        <PublicCatalogSearchFilterControl
                          key={definition.id}
                          definition={definition}
                          context={panelContext}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </PublicCatalogSearchFilterSection>
          ))}
        </Accordion>
      ) : null}
    </div>
  );
}
