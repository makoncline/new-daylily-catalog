"use client";

import { type Table } from "@tanstack/react-table";
import { Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NoResults } from "@/app/(public)/[userSlugOrId]/_components/no-results";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { H2, Muted } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { useDataTable } from "@/hooks/use-data-table";
import { cn } from "@/lib/utils";
import {
  buildPublicCatalogSearchColumnNames,
  buildPublicCatalogSearchFacetOptions,
  buildPublicCatalogSearchListOptions,
} from "./public-catalog-search-registry";
import { publicCatalogSearchColumns } from "./public-catalog-search-columns";
import { PublicCatalogSearchAdvancedPanel } from "./public-catalog-search-advanced-panel";
import { PublicCatalogSearchTable } from "./public-catalog-search-table";
import {
  type PublicCatalogListing,
  type PublicCatalogLists,
  type PublicCatalogSearchContentProps,
  type PublicCatalogSearchFacetOption,
  type PublicCatalogSearchFacetOptions,
  type PublicCatalogSearchMode,
} from "./public-catalog-search-types";
import { type PublicCatalogSearchControllerState } from "./public-catalog-search-controller";

interface PublicCatalogSearchContentViewProps {
  lists: PublicCatalogLists;
  listings: PublicCatalogListing[];
  listOptions: PublicCatalogSearchFacetOption[];
  facetOptions: PublicCatalogSearchFacetOptions;
  mode: PublicCatalogSearchMode;
  panelCollapsed: boolean;
  setPanelCollapsed: (collapsed: boolean) => void;
  setMode: (mode: PublicCatalogSearchMode) => void;
  scrollToResultsSummary: () => void;
  table: Table<PublicCatalogListing>;
  isLoading: boolean;
  totalListingsCount: number;
  isRefreshingCatalogData?: boolean;
  onRefreshCatalogData?: () => void;
}

type PublicCatalogSearchContentWithControllerProps =
  PublicCatalogSearchContentProps & {
    controller?: PublicCatalogSearchControllerState;
  };

function parseModeParam(modeValue: string | null): PublicCatalogSearchMode {
  return modeValue === "advanced" ? "advanced" : "basic";
}

function PublicCatalogSearchContentView({
  table,
  listOptions,
  facetOptions,
  mode,
  panelCollapsed,
  setPanelCollapsed,
  setMode,
  scrollToResultsSummary,
  isLoading,
  totalListingsCount,
  isRefreshingCatalogData = false,
  onRefreshCatalogData,
}: PublicCatalogSearchContentViewProps) {
  const hasFilters =
    table.getState().globalFilter !== "" ||
    table.getState().columnFilters.length > 0;

  return (
    <div className="space-y-8">
      <div id="listings" className="space-y-4">
        <div className="flex items-center justify-between">
          <div
            id="public-search-results-summary"
            className="flex items-baseline gap-2"
          >
            <H2 className="text-2xl">Listings</H2>
            <Muted>{totalListingsCount.toLocaleString()} total</Muted>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefreshCatalogData}
              disabled={isRefreshingCatalogData}
              aria-label="Refresh catalog data"
              data-testid="catalog-search-refresh"
              data-state={isRefreshingCatalogData ? "refreshing" : "idle"}
            >
              <RefreshCw
                className={cn(
                  "mr-2 h-4 w-4",
                  isRefreshingCatalogData && "animate-spin",
                )}
              />
              Refresh data
            </Button>

            {isLoading && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading more listings...</span>
              </div>
            )}
            {isRefreshingCatalogData && (
              <div className="text-muted-foreground text-sm">
                Refreshing cached results...
              </div>
            )}
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-4 lg:items-start",
            panelCollapsed
              ? "lg:grid-cols-[auto_minmax(0,1fr)]"
              : "lg:grid-cols-[320px_minmax(0,1fr)]",
          )}
        >
          <div className="lg:sticky lg:top-4">
            <PublicCatalogSearchAdvancedPanel
              table={table}
              listOptions={listOptions}
              facetOptions={facetOptions}
              mode={mode}
              onModeChange={setMode}
              collapsed={panelCollapsed}
              onCollapsedChange={setPanelCollapsed}
              onSearchSubmit={scrollToResultsSummary}
            />
          </div>

          <div className="space-y-4">
            {table.getRowModel().rows.length === 0 ? (
              <NoResults filtered={hasFilters} />
            ) : (
              <>
                <PublicCatalogSearchTable
                  table={table}
                  desktopColumns={panelCollapsed ? 3 : 2}
                />
                <DataTablePagination table={table} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicCatalogSearchUncontrolledContent({
  lists,
  listings,
  isLoading,
  totalListingsCount,
  isRefreshingCatalogData = false,
  onRefreshCatalogData,
}: PublicCatalogSearchContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const columnNames = useMemo(() => buildPublicCatalogSearchColumnNames(), []);

  const table = useDataTable({
    data: listings,
    columns: publicCatalogSearchColumns,
    storageKey: "public-catalog-listings-table",
    columnNames,
  });

  const mode = parseModeParam(searchParams.get("mode"));
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const listOptions = useMemo(
    () => buildPublicCatalogSearchListOptions(lists, listings),
    [lists, listings],
  );

  const facetOptions = useMemo(
    () => buildPublicCatalogSearchFacetOptions(listings),
    [listings],
  );

  const setMode = (nextMode: PublicCatalogSearchMode) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextMode === "advanced") {
      params.set("mode", "advanced");
    } else {
      params.delete("mode");
    }

    const query = params.toString();
    void router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const scrollToResultsSummary = () => {
    const target = document.getElementById("public-search-results-summary");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PublicCatalogSearchContentView
      lists={lists}
      listings={listings}
      table={table}
      listOptions={listOptions}
      facetOptions={facetOptions}
      mode={mode}
      panelCollapsed={panelCollapsed}
      setPanelCollapsed={setPanelCollapsed}
      setMode={setMode}
      scrollToResultsSummary={scrollToResultsSummary}
      isLoading={isLoading}
      totalListingsCount={totalListingsCount}
      isRefreshingCatalogData={isRefreshingCatalogData}
      onRefreshCatalogData={onRefreshCatalogData}
    />
  );
}

function PublicCatalogSearchControlledContent({
  lists,
  listings,
  isLoading,
  totalListingsCount,
  isRefreshingCatalogData,
  onRefreshCatalogData,
  controller,
}: PublicCatalogSearchContentProps & {
  controller: PublicCatalogSearchControllerState;
}) {
  return (
    <PublicCatalogSearchContentView
      lists={lists}
      listings={listings}
      table={controller.table}
      listOptions={controller.listOptions}
      facetOptions={controller.facetOptions}
      mode={controller.mode}
      panelCollapsed={controller.panelCollapsed}
      setPanelCollapsed={controller.setPanelCollapsed}
      setMode={controller.setMode}
      scrollToResultsSummary={controller.scrollToResultsSummary}
      isLoading={isLoading}
      totalListingsCount={totalListingsCount}
      isRefreshingCatalogData={
        isRefreshingCatalogData ?? controller.isRefreshingCatalogData
      }
      onRefreshCatalogData={onRefreshCatalogData ?? controller.refreshCatalogData}
    />
  );
}

export function PublicCatalogSearchContent(
  props: PublicCatalogSearchContentWithControllerProps,
) {
  if (props.controller) {
    return <PublicCatalogSearchControlledContent {...props} controller={props.controller} />;
  }

  return <PublicCatalogSearchUncontrolledContent {...props} />;
}
