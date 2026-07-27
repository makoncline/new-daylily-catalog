"use client";

import { PanelLeftClose, Search } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  countPublicCatalogSearchSectionFilters,
  PUBLIC_CATALOG_SEARCH_CULTIVAR_SECTION_DEFINITIONS,
  PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS,
  PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS,
  type PublicCatalogSearchSectionDefinition,
} from "./public-catalog-search-registry";
import { PublicCatalogSearchFilterSection } from "./public-catalog-search-panel-controls";
import {
  PublicCatalogSearchActiveFilterChips,
  type PublicCatalogSearchComposerContext,
  PublicCatalogSearchFilterField,
  PublicCatalogSearchFilterFields,
  PublicCatalogSearchQueryField,
  PublicCatalogSearchSection,
} from "./public-catalog-search-composable";
import { type PublicCatalogSearchAdvancedPanelProps } from "./public-catalog-search-types";

function getSectionGroupFilters(
  section: PublicCatalogSearchSectionDefinition,
  filterIds: string[],
) {
  type SectionFilter = (typeof section.filters)[number];
  const filtersById = new Map(
    section.filters.map((filter) => [filter.id, filter]),
  );
  const filters: SectionFilter[] = [];

  for (const filterId of filterIds) {
    const filter = filtersById.get(filterId);
    if (filter) {
      filters.push(filter);
    }
  }

  return filters;
}

function AdvancedSectionFields<TData>({
  context,
  section,
}: {
  context: PublicCatalogSearchComposerContext<TData>;
  section: PublicCatalogSearchSectionDefinition;
}) {
  return (
    <div className="space-y-4">
      {section.groups.map((group) => {
        const groupFilters = getSectionGroupFilters(section, group.filterIds);

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
                context={context}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AdvancedSectionsAccordion<TData>({
  context,
  sectionDefinitions,
  className,
}: {
  context: PublicCatalogSearchComposerContext<TData>;
  sectionDefinitions: PublicCatalogSearchSectionDefinition[];
  className?: string;
}) {
  return (
    <Accordion
      type="multiple"
      defaultValue={["listing"]}
      className={cn("mt-4 space-y-1", className)}
    >
      {sectionDefinitions.map((section) => (
        <PublicCatalogSearchFilterSection
          key={section.id}
          definition={section}
          count={countPublicCatalogSearchSectionFilters(context.table, section)}
          className={cn(section.id === "details" && "border-b-0")}
        >
          <AdvancedSectionFields context={context} section={section} />
        </PublicCatalogSearchFilterSection>
      ))}
    </Accordion>
  );
}

export function PublicCatalogSearchAdvancedPanel<TData>({
  advancedSectionsColumns = 1,
  table,
  listOptions,
  facetOptions,
  mode,
  onModeChange,
  collapsed,
  onCollapsedChange,
  onSearchSubmit,
  showCultivarFacets = false,
  toolbarFilterIds,
}: PublicCatalogSearchAdvancedPanelProps<TData>) {
  const isAdvanced = mode === "advanced";
  const panelContext = { table, listOptions, facetOptions };
  const sectionDefinitions = showCultivarFacets
    ? PUBLIC_CATALOG_SEARCH_CULTIVAR_SECTION_DEFINITIONS
    : PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS;
  const toolbarFilters = PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS.filter(
    (definition) =>
      (listOptions.length > 0 || definition.id !== "lists") &&
      (!toolbarFilterIds || toolbarFilterIds.includes(definition.id)),
  );
  const wideSectionColumns = [
    sectionDefinitions.filter(
      (section) => section.id === "listing" || section.id === "registration",
    ),
    sectionDefinitions.filter((section) => section.id === "traits"),
    sectionDefinitions.filter((section) => section.id === "details"),
  ];

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
          className="size-8"
          onClick={() => onCollapsedChange(false)}
          data-testid="search-panel-expand"
        >
          <Search className="size-4" />
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
            className="size-6"
            onClick={() => onCollapsedChange(true)}
            data-testid="search-panel-collapse"
          >
            <PanelLeftClose className="size-3.5" />
            <span className="sr-only">Collapse search panel</span>
          </Button>
          <span className="text-sm font-semibold">Search</span>
        </div>
        <label
          htmlFor="search-mode-switch"
          className="flex items-center gap-2"
          data-testid="search-mode-toggle"
        >
          <span className="text-muted-foreground text-xs">Advanced</span>
          <Switch
            id="search-mode-switch"
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
        definitions={toolbarFilters}
        context={panelContext}
      />

      {isAdvanced ? (
        advancedSectionsColumns === 3 ? (
          <>
            <AdvancedSectionsAccordion
              className="lg:hidden"
              context={panelContext}
              sectionDefinitions={sectionDefinitions}
            />
            <div
              className="mt-5 hidden gap-x-6 lg:grid lg:grid-cols-3"
              data-testid="advanced-search-sections-wide"
            >
              {wideSectionColumns.map((sections) => (
                <div
                  key={sections.map((section) => section.id).join("-")}
                  className="space-y-6"
                >
                  {sections.map((section) => (
                    <PublicCatalogSearchSection
                      key={section.id}
                      title={section.label}
                    >
                      <AdvancedSectionFields
                        context={panelContext}
                        section={section}
                      />
                    </PublicCatalogSearchSection>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <AdvancedSectionsAccordion
            context={panelContext}
            sectionDefinitions={sectionDefinitions}
          />
        )
      ) : null}
    </div>
  );
}
