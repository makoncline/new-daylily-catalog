"use client";

import { PanelLeftClose, Search } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  countPublicCatalogSearchSectionFilters,
  PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS,
  PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS,
} from "./public-catalog-search-registry";
import { PublicCatalogSearchFilterSection } from "./public-catalog-search-panel-controls";
import {
  PublicCatalogSearchActiveFilterChips,
  PublicCatalogSearchFilterField,
  PublicCatalogSearchFilterFields,
  PublicCatalogSearchQueryField,
  PublicCatalogSearchSection,
} from "./public-catalog-search-composable";
import { type PublicCatalogSearchAdvancedPanelProps } from "./public-catalog-search-types";

function getSectionGroupFilters(
  section: (typeof PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS)[number],
  filterIds: string[],
) {
  type SectionFilter = (typeof section.filters)[number];

  return filterIds
    .map((filterId) => section.filters.find((filter) => filter.id === filterId))
    .filter((filter): filter is SectionFilter => filter !== undefined);
}

export function PublicCatalogSearchAdvancedPanel<TData>({
  table,
  listOptions,
  facetOptions,
  mode,
  onModeChange,
  collapsed,
  onCollapsedChange,
  onSearchSubmit,
}: PublicCatalogSearchAdvancedPanelProps<TData>) {
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

      <PublicCatalogSearchActiveFilterChips
        className="mb-3"
        table={table}
        listOptions={listOptions}
      />

      <PublicCatalogSearchSection className="mt-3" title="Filters apply live">
        <PublicCatalogSearchQueryField
          table={table}
          onSubmit={onSearchSubmit}
        />
      </PublicCatalogSearchSection>

      <PublicCatalogSearchFilterFields
        className="mt-4 flex flex-wrap items-center gap-2"
        definitions={PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS}
        context={panelContext}
      />

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
                        <PublicCatalogSearchFilterField
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
