"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NoResults } from "@/app/(public)/[userSlugOrId]/_components/no-results";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { H2, Muted } from "@/components/typography";
import { useDataTable } from "@/hooks/use-data-table";
import { cn } from "@/lib/utils";
import {
  type PublicCatalogSearchFacetOption,
  type PublicCatalogSearchMode,
  type PublicCatalogListing,
  type PublicCatalogSearchContentProps,
} from "./public-catalog-search-types";
import { publicCatalogSearchColumns } from "./public-catalog-search-columns";
import { PublicCatalogSearchAdvancedPanel } from "./public-catalog-search-advanced-panel";
import { PublicCatalogSearchTable } from "./public-catalog-search-table";

function getFacetOptionsFromListings(
  listings: PublicCatalogListing[],
  getValue: (listing: PublicCatalogListing) => string | null | undefined,
): PublicCatalogSearchFacetOption[] {
  const counts = new Map<string, { label: string; count: number }>();

  listings.forEach((listing) => {
    const rawValue = getValue(listing);
    if (typeof rawValue !== "string") {
      return;
    }

    const label = rawValue.trim();
    if (label.length === 0) {
      return;
    }

    const key = label.toLowerCase();
    const existing = counts.get(key);

    if (existing) {
      existing.count += 1;
      return;
    }

    counts.set(key, { label, count: 1 });
  });

  return Array.from(counts.values())
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((option) => ({
      label: option.label,
      value: option.label,
      count: option.count,
    }));
}

function parseModeParam(modeValue: string | null): PublicCatalogSearchMode {
  return modeValue === "advanced" ? "advanced" : "basic";
}

export function PublicCatalogSearchContent({
  lists,
  listings,
  isLoading,
  totalListingsCount,
}: PublicCatalogSearchContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const table = useDataTable({
    data: listings,
    columns: publicCatalogSearchColumns,
    storageKey: "public-catalog-listings-table",
  });

  const mode = parseModeParam(searchParams.get("mode"));
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const hasFilters =
    table.getState().globalFilter !== "" ||
    table.getState().columnFilters.length > 0;

  const listOptions = useMemo(() => {
    const listCounts = new Map<string, number>();

    listings.forEach((listing: PublicCatalogListing) => {
      listing.lists.forEach((list: { id: string; title: string }) => {
        const count = listCounts.get(list.id) ?? 0;
        listCounts.set(list.id, count + 1);
      });
    });

    return lists.map((list) => ({
      label: list.title,
      value: list.id,
      count: listCounts.get(list.id) ?? 0,
    }));
  }, [lists, listings]);

  const facetOptions = useMemo(
    () => ({
      bloomHabit: getFacetOptionsFromListings(
        listings,
        (listing) => listing.ahsListing?.bloomHabit,
      ),
      bloomSeason: getFacetOptionsFromListings(
        listings,
        (listing) => listing.ahsListing?.bloomSeason,
      ),
      form: getFacetOptionsFromListings(
        listings,
        (listing) => listing.ahsListing?.form,
      ),
      ploidy: getFacetOptionsFromListings(
        listings,
        (listing) => listing.ahsListing?.ploidy,
      ),
      foliageType: getFacetOptionsFromListings(
        listings,
        (listing) => listing.ahsListing?.foliageType,
      ),
      fragrance: getFacetOptionsFromListings(
        listings,
        (listing) => listing.ahsListing?.fragrance,
      ),
    }),
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
    <div className="space-y-8">
      <div id="listings" className="space-y-4">
        <div className="flex items-center justify-between">
          <div id="public-search-results-summary" className="flex items-baseline gap-2">
            <H2 className="text-2xl">Listings</H2>
            <Muted>{totalListingsCount.toLocaleString()} total</Muted>
          </div>

          {isLoading && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more listings...</span>
            </div>
          )}
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
