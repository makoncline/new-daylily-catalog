"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { CreateListingButton } from "./create-listing-button";
import { useEditListing } from "./edit-listing-dialog";
import { useDataTable } from "@/hooks/use-data-table";
import {
  DataTableDownload,
  DataTableViewOptions,
} from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { LISTING_TABLE_COLUMN_NAMES } from "@/config/constants";
import { getColumns } from "./columns";
import { useDashboardListingReadModel } from "@/app/dashboard/_lib/dashboard-db/use-dashboard-listing-read-model";
import {
  PublicCatalogSearchFilterChips,
  PublicCatalogSearchFilterField,
  PublicCatalogSearchFilterFields,
  PublicCatalogSearchQueryField,
  PublicCatalogSearchResetButton,
  PublicCatalogSearchResultCount,
  PublicCatalogSearchSection,
} from "@/components/public-catalog-search/public-catalog-search-composable";
import { Switch } from "@/components/ui/switch";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  buildPublicCatalogSearchColumnNames,
  buildPublicCatalogSearchFacetOptions,
  buildPublicCatalogSearchListOptions,
  PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS,
  PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS,
  type PublicCatalogSearchSectionDefinition,
} from "@/components/public-catalog-search/public-catalog-search-registry";
import type { PublicCatalogSearchMode } from "@/components/public-catalog-search/public-catalog-search-types";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";

function getSectionGroupFilters(
  section: PublicCatalogSearchSectionDefinition,
  filterIds: string[],
) {
  return filterIds
    .map((filterId) => section.filters.find((filter) => filter.id === filterId))
    .filter((filter) => filter !== undefined);
}

function isFacetFilterGroup(
  section: PublicCatalogSearchSectionDefinition,
  filterIds: string[],
) {
  const filters = getSectionGroupFilters(section, filterIds);
  return (
    filters.length > 0 && filters.every((filter) => filter.kind === "facet")
  );
}

function ListingsTableLive() {
  const firstRowsPaintedRef = React.useRef(false);
  const { editListing } = useEditListing();
  const { listingRows: listings, lists } = useDashboardListingReadModel();

  const columns = getColumns(editListing);
  const [searchMode, setSearchMode] = useLocalStorage<PublicCatalogSearchMode>(
    "dashboard-listings-search-mode",
    "basic",
  );
  const [searchCollapsed, setSearchCollapsed] = useLocalStorage(
    "dashboard-listings-search-collapsed",
    false,
  );
  const columnNames = React.useMemo(
    () => ({
      ...LISTING_TABLE_COLUMN_NAMES,
      ...buildPublicCatalogSearchColumnNames(),
      hasPhoto: "Has Photo",
      linkedToCultivar: "Linked to Cultivar",
      priceValue: "Price Range",
    }),
    [],
  );

  const table = useDataTable({
    data: listings,
    columns,
    storageKey: "listings-table",
    columnNames,
    pinnedColumns: {
      left: ["select", "title"],
      right: ["actions"],
    },
    config: {
      enableRowSelection: true,
    },
    initialStateOverrides: {
      pagination: {
        pageSize: APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_DEFAULT,
      },
      columnVisibility: {
        cultivarName: false,
        hasPhoto: false,
        linkedToCultivar: false,
        parentage: false,
        priceValue: false,
      },
    },
  });

  const listOptions = React.useMemo(
    () => buildPublicCatalogSearchListOptions(lists, listings),
    [lists, listings],
  );

  const facetOptions = React.useMemo(
    () => buildPublicCatalogSearchFacetOptions(listings),
    [listings],
  );

  React.useEffect(() => {
    logDashboardTiming("listings-table.mounted");
  }, []);

  React.useEffect(() => {
    if (firstRowsPaintedRef.current || listings.length === 0) return;

    firstRowsPaintedRef.current = true;
    logDashboardTiming("listings-table.first-rows-painted", {
      listings: listings.length,
      lists: lists.length,
      tableRows: table.getRowModel().rows.length,
      filteredRows: table.getFilteredRowModel().rows.length,
    });
  }, [listings.length, lists.length, table]);

  const scrollToResultsSummary = () => {
    document
      .getElementById("dashboard-listings-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.key === "/"
      ) {
        event.preventDefault();
        setSearchCollapsed((collapsed) => !collapsed);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSearchCollapsed]);

  if (!listings.length) {
    return (
      <EmptyState
        title="No listings"
        description="Create your first listing to start selling"
        action={<CreateListingButton />}
      />
    );
  }

  const searchContext = { table, listOptions, facetOptions };
  const isAdvanced = searchMode === "advanced";

  return (
    <div className="space-y-4" data-testid="listing-table">
      <div className="bg-muted/10 space-y-1.5 rounded-md border p-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">Search</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5"
            onClick={() => setSearchCollapsed((collapsed) => !collapsed)}
            title="Toggle search filters (Alt+/)"
            data-testid="search-collapse-toggle"
          >
            {searchCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            <span className="sr-only">
              {searchCollapsed ? "Show search filters" : "Hide search filters"}
            </span>
          </Button>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <PublicCatalogSearchResultCount table={table} />
            <PublicCatalogSearchFilterChips
              table={table}
              listOptions={listOptions}
            />
          </div>
          <PublicCatalogSearchResetButton table={table} />
        </div>

        {!searchCollapsed ? (
          <div className="space-y-2 border-t pt-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <div className="space-y-1.5">
                <div className="text-xs font-medium tracking-wide uppercase">
                  Listing Search
                </div>
                <PublicCatalogSearchQueryField
                  table={table}
                  onSubmit={scrollToResultsSummary}
                  inputClassName="h-8"
                />
              </div>

              <label
                className="grid grid-rows-[auto_2rem] justify-items-center gap-1"
                data-testid="search-mode-toggle"
              >
                <span className="text-xs font-medium tracking-wide uppercase">
                  Advanced
                </span>
                <Switch
                  checked={isAdvanced}
                  onCheckedChange={(checked) =>
                    setSearchMode(checked ? "advanced" : "basic")
                  }
                  data-testid="search-mode-switch"
                />
              </label>
            </div>

            <PublicCatalogSearchFilterFields
              className="flex flex-wrap items-center gap-2"
              definitions={PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS}
              context={searchContext}
            />
          </div>
        ) : null}

        {!searchCollapsed && isAdvanced ? (
          <div className="grid grid-cols-1 gap-4 border-t pt-3 lg:grid-cols-4">
            {PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS.map((section) => (
              <PublicCatalogSearchSection
                key={section.id}
                title={section.label}
              >
                <div className="space-y-3">
                  {section.groups.map((group) => {
                    const groupFilters = getSectionGroupFilters(
                      section,
                      group.filterIds,
                    );

                    if (groupFilters.length === 0) {
                      return null;
                    }

                    const facetGroup = isFacetFilterGroup(
                      section,
                      group.filterIds,
                    );

                    return (
                      <div
                        key={group.filterIds.join("-")}
                        className={
                          facetGroup
                            ? "flex flex-wrap items-start gap-2"
                            : "space-y-3"
                        }
                      >
                        {groupFilters.map((definition) => (
                          <PublicCatalogSearchFilterField
                            key={definition.id}
                            definition={definition}
                            context={searchContext}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </PublicCatalogSearchSection>
            ))}
          </div>
        ) : null}
      </div>

      <div id="dashboard-listings-results" className="min-w-0">
        <DataTableLayout
          table={table}
          toolbar={
            <div className="flex items-center justify-end">
              <DataTableViewOptions table={table} />
            </div>
          }
          pagination={
            <>
              <DataTablePagination
                table={table}
                pageSizeOptions={
                  APP_CONFIG.TABLE.PAGINATION.DASHBOARD_PAGE_SIZE_OPTIONS
                }
              />
              <DataTableDownload table={table} filenamePrefix="listings" />
            </>
          }
          noResults={
            <EmptyState
              title="No listings found"
              description="Try adjusting your filters or create a new listing"
              action={<CreateListingButton />}
            />
          }
        >
          <DataTable table={table} />
        </DataTableLayout>
      </div>
    </div>
  );
}

export function ListingsTable() {
  return <ListingsTableLive />;
}
