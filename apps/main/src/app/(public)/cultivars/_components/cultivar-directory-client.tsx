"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { CultivarCard } from "@/components/cultivar-card";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
  PublicCatalogSearchFilterChips,
  PublicCatalogSearchFilterField,
  PublicCatalogSearchFilterFields,
  PublicCatalogSearchQueryField,
  PublicCatalogSearchResetButton,
  PublicCatalogSearchResultCount,
  PublicCatalogSearchSection,
} from "@/components/public-catalog-search/public-catalog-search-composable";
import {
  buildPublicCatalogSearchFacetOptions,
  PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS,
  PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS,
  type PublicCatalogSearchFilterDefinition,
  type PublicCatalogSearchSectionDefinition,
} from "@/components/public-catalog-search/public-catalog-search-registry";
import { parseNumericRange } from "@/components/public-catalog-search/public-catalog-search-filter-utils";
import type { PublicCatalogSearchMode } from "@/components/public-catalog-search/public-catalog-search-types";
import { defaultTableConfig } from "@/lib/table-config";
import type {
  PublicCultivarSearchFilters,
  PublicCultivarSearchResult,
} from "@/lib/public-cultivar-search";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cultivarSearchColumns } from "./cultivar-search-columns";

const EMPTY_LIST_OPTIONS: [] = [];
const CULTIVAR_TOOLBAR_FILTERS = PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS.filter(
  (definition) => definition.id === "hasPhoto",
);
const CULTIVAR_SECTION_DEFINITIONS = PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS.flatMap(
  (section): PublicCatalogSearchSectionDefinition[] => {
    if (section.id === "listing") return [];

    const filters = section.filters.filter(
      (definition) =>
        definition.id !== "cultivarName" &&
        definition.id !== "linkedToCultivar",
    );
    const filterIds = new Set(filters.map((definition) => definition.id));
    const groups = section.groups
      .map((group) => ({
        ...group,
        filterIds: group.filterIds.filter((id) => filterIds.has(id)),
      }))
      .filter((group) => group.filterIds.length > 0);

    return [{ ...section, filters, groups }];
  },
);

function rangeFilter(
  id: string,
  min: number | undefined,
  max: number | undefined,
) {
  if (min === undefined && max === undefined) return [];
  return [
    {
      id,
      value: `${min ?? ""} - ${max ?? ""}`,
    },
  ];
}

function initialColumnFilters(filters: PublicCultivarSearchFilters) {
  return [
    ...(filters.hasPhoto ? [{ id: "hasPhoto", value: true }] : []),
    ...(filters.hybridizer
      ? [{ id: "hybridizer", value: filters.hybridizer }]
      : []),
    ...(filters.color ? [{ id: "color", value: filters.color }] : []),
    ...(filters.parentage
      ? [{ id: "parentage", value: filters.parentage }]
      : []),
    ...(filters.bloomHabit
      ? [{ id: "bloomHabit", value: filters.bloomHabit }]
      : []),
    ...(filters.bloomSeason
      ? [{ id: "bloomSeason", value: filters.bloomSeason }]
      : []),
    ...(filters.form ? [{ id: "form", value: filters.form }] : []),
    ...(filters.ploidy ? [{ id: "ploidy", value: filters.ploidy }] : []),
    ...(filters.foliageType
      ? [{ id: "foliageType", value: filters.foliageType }]
      : []),
    ...(filters.fragrance
      ? [{ id: "fragrance", value: filters.fragrance }]
      : []),
    ...rangeFilter("year", filters.yearMin, filters.yearMax),
    ...rangeFilter(
      "scapeHeight",
      filters.scapeHeightMin,
      filters.scapeHeightMax,
    ),
    ...rangeFilter("bloomSize", filters.bloomSizeMin, filters.bloomSizeMax),
    ...rangeFilter("budcount", filters.budcountMin, filters.budcountMax),
    ...rangeFilter("branches", filters.branchesMin, filters.branchesMax),
  ];
}

const RANGE_QUERY_KEYS: Record<string, [string, string]> = {
  bloomSize: ["bloomSizeMin", "bloomSizeMax"],
  branches: ["branchesMin", "branchesMax"],
  budcount: ["budcountMin", "budcountMax"],
  scapeHeight: ["scapeHeightMin", "scapeHeightMax"],
  year: ["yearMin", "yearMax"],
};

function addFilterParam(
  params: URLSearchParams,
  definition: PublicCatalogSearchFilterDefinition | undefined,
  value: unknown,
) {
  if (!definition || value === undefined || value === null || value === false) {
    return;
  }

  if (definition.kind === "range") {
    const range = parseNumericRange(value);
    const keys = RANGE_QUERY_KEYS[definition.id];
    if (!range || !keys) return;
    if (range.min !== null) params.set(keys[0], String(range.min));
    if (range.max !== null) params.set(keys[1], String(range.max));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item: unknown) => {
      if (typeof item === "string" || typeof item === "number") {
        params.append(definition.id, String(item));
      }
    });
    return;
  }

  if (value === true) {
    params.set(definition.id, "1");
  } else if (typeof value === "string" || typeof value === "number") {
    params.set(definition.id, String(value));
  }
}

export function CultivarDirectoryClient({
  catalogCount,
  filters,
  initialMode,
  results,
}: {
  catalogCount: number;
  filters: PublicCultivarSearchFilters;
  initialMode: PublicCatalogSearchMode;
  results: PublicCultivarSearchResult[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState(initialMode);
  const facetOptions = useMemo(
    () => buildPublicCatalogSearchFacetOptions(results),
    [results],
  );
  // TanStack Table intentionally returns mutable APIs; React Compiler skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...defaultTableConfig<PublicCultivarSearchResult>(),
    data: results,
    columns: cultivarSearchColumns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      globalFilter: filters.q ?? "",
      columnFilters: initialColumnFilters(filters),
      pagination: { pageIndex: 0, pageSize: 24 },
    },
  });
  const tableState = table.getState();
  const filterDefinitions = useMemo(
    () =>
      new Map(
        [...CULTIVAR_TOOLBAR_FILTERS, ...CULTIVAR_SECTION_DEFINITIONS.flatMap((section) => section.filters)].map(
          (definition) => [definition.id, definition],
        ),
      ),
    [],
  );
  const nextQueryString = useMemo(() => {
    const params = new URLSearchParams();
    const globalFilter: unknown = tableState.globalFilter;
    if (typeof globalFilter === "string" && globalFilter.trim()) {
      params.set("q", globalFilter.trim());
    }
    if (mode === "advanced") params.set("mode", "advanced");

    tableState.columnFilters.forEach(({ id, value }) => {
      addFilterParam(params, filterDefinitions.get(id), value);
    });
    return params.toString();
  }, [filterDefinitions, mode, tableState.columnFilters, tableState.globalFilter]);

  useEffect(() => {
    if (nextQueryString === searchParams.toString()) return;

    const timeout = window.setTimeout(() => {
      router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
        scroll: false,
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [nextQueryString, pathname, router, searchParams]);

  const context = { table, listOptions: EMPTY_LIST_OPTIONS, facetOptions };
  const visibleRows = table.getRowModel().rows;

  return (
    <div className="space-y-8">
      <section aria-label="Cultivar search" className="space-y-4 border-y py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="cultivar-search-input">
              Search cultivars
            </label>
            <PublicCatalogSearchQueryField
              table={table}
              placeholder="Search by cultivar, hybridizer, color, or parentage"
              inputClassName="h-10"
              onSubmit={() =>
                document
                  .getElementById("cultivar-results")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
          </div>

          <label className="grid justify-items-center gap-2 text-xs font-medium" htmlFor="cultivar-search-mode">
            Advanced
            <Switch
              id="cultivar-search-mode"
              checked={mode === "advanced"}
              onCheckedChange={(checked) => setMode(checked ? "advanced" : "basic")}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PublicCatalogSearchResultCount table={table} />
            <PublicCatalogSearchFilterChips table={table} listOptions={EMPTY_LIST_OPTIONS} />
          </div>
          <PublicCatalogSearchResetButton table={table} />
        </div>

        <PublicCatalogSearchFilterFields
          className="flex flex-wrap gap-2"
          definitions={CULTIVAR_TOOLBAR_FILTERS}
          context={context}
        />

        {mode === "advanced" ? (
          <div className="grid gap-6 border-t pt-5 md:grid-cols-3">
            {CULTIVAR_SECTION_DEFINITIONS.map((section) => (
              <PublicCatalogSearchSection key={section.id} title={section.label}>
                <div className="space-y-4">
                  {section.groups.map((group) => (
                    <div key={group.filterIds.join("-")} className={group.className ?? "space-y-4"}>
                      {group.filterIds.map((filterId) => {
                        const definition = section.filters.find((filter) => filter.id === filterId);
                        return definition ? (
                          <PublicCatalogSearchFilterField
                            key={definition.id}
                            definition={definition}
                            context={context}
                          />
                        ) : null;
                      })}
                    </div>
                  ))}
                </div>
              </PublicCatalogSearchSection>
            ))}
          </div>
        ) : null}
      </section>

      <section id="cultivar-results" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Cultivars</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {results.length.toLocaleString()} shown from {catalogCount.toLocaleString()} cultivars
            </p>
          </div>
          {tableState.globalFilter || tableState.columnFilters.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => {
              table.resetGlobalFilter(true);
              table.resetColumnFilters(true);
            }}>
              <Search className="size-4" />
              Clear search
            </Button>
          ) : null}
        </div>

        {visibleRows.length > 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRows.map((row, index) => (
                <CultivarCard
                  key={row.original.segment}
                  cultivar={row.original}
                  nofollow={false}
                  priority={index < 3}
                  className="w-full min-w-0 max-w-none"
                />
              ))}
            </div>
            <DataTablePagination table={table} />
          </>
        ) : (
          <div className="py-12 text-center">
            <h3 className="text-lg font-semibold">No cultivars found</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Try a broader name or remove one of the filters.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
