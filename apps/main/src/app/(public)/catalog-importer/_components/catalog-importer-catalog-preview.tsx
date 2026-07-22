"use client";

import { useMemo, useRef, useState } from "react";
import {
  type ColumnFiltersState,
  type OnChangeFn,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUp, ChevronDown, ImageIcon, Info, Link2 } from "lucide-react";
import { AhsListingDisplay } from "@/components/ahs-listing-display";
import { ImagePlaceholder } from "@/components/image-placeholder";
import type { OptimizedImageSource } from "@/components/optimized-image";
import { OptimizedImage } from "@/components/optimized-image";
import { PublicCatalogSearchAdvancedPanel } from "@/components/public-catalog-search/public-catalog-search-advanced-panel";
import {
  type CatalogSearchListingRow,
  createPublicCatalogSearchColumns,
} from "@/components/public-catalog-search/public-catalog-search-columns";
import { splitFacetValue } from "@/components/public-catalog-search/public-catalog-search-filter-utils";
import { buildPublicCatalogSearchFacetOptions } from "@/components/public-catalog-search/public-catalog-search-registry";
import type {
  PublicCatalogSearchFacetOption,
  PublicCatalogSearchMode,
} from "@/components/public-catalog-search/public-catalog-search-types";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { H2, Muted, P } from "@/components/typography";
import {
  getCandidateAhsDisplayListing,
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";
import { defaultTableConfig } from "@/lib/table-config";
import { cn, formatPrice } from "@/lib/utils";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";

const PREVIEW_PAGE_SIZE = 20;

interface CatalogImporterPreviewListing extends CatalogSearchListingRow {
  importRow: CatalogImportRow;
}

const PREVIEW_SEARCH_COLUMNS =
  createPublicCatalogSearchColumns<CatalogImporterPreviewListing>();
export const CATALOG_IMPORTER_PREVIEW_FILTER_IDS = PREVIEW_SEARCH_COLUMNS.map(
  (column) => column.id,
).filter((id): id is string => Boolean(id));
const PREVIEW_LIST_OPTIONS: PublicCatalogSearchFacetOption[] = [];

export function isCatalogPreviewRow(row: CatalogImportRow) {
  return row.linkState === "linked" && row.match !== null;
}

export function getCatalogPreviewRowId(rowId: string) {
  return `catalog-preview-row-${rowId.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function getCatalogPreviewImage(
  row: CatalogImportRow,
): OptimizedImageSource | null {
  if (row.imageUrl) {
    return {
      id: `uploaded-${row.id}`,
      url: row.imageUrl,
    };
  }

  return getCultivarImage(row.match);
}

export function getCatalogPreviewImageLabel(row: CatalogImportRow) {
  if (row.imageUrl) return "Seller photo";
  return getCultivarImage(row.match) ? "Reference photo" : null;
}

export function getCatalogPreviewDescription(row: CatalogImportRow) {
  if (row.description) {
    return row.description;
  }

  return getCatalogPreviewDatabaseDescription(row);
}

export function getCatalogPreviewDatabaseDescription(row: CatalogImportRow) {
  return row.match ? getCultivarTraitSummary(row.match).join(" · ") : "";
}

function CatalogImporterListingCard({
  highlighted = false,
  onImageError,
  onOpen,
  openLabel,
  row,
}: {
  highlighted?: boolean;
  onImageError?: () => void;
  onOpen: () => void;
  openLabel?: string;
  row: CatalogImportRow;
}) {
  const match = row.match;
  if (!match) return null;

  const image = getCatalogPreviewImage(row);
  const imageLabel = getCatalogPreviewImageLabel(row);
  const sellerDescription = row.description.trim();
  const databaseDescription = getCatalogPreviewDatabaseDescription(row);

  return (
    <article
      aria-label={match.displayName}
      className={cn(
        "bg-card overflow-hidden rounded-lg border transition-shadow motion-reduce:transition-none",
        highlighted && "ring-primary ring-2 ring-offset-2",
      )}
    >
      <button
        type="button"
        aria-label={openLabel ?? `View details for ${match.displayName}`}
        className="focus-visible:ring-ring relative block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
        onClick={onOpen}
      >
        {image ? (
          <OptimizedImage
            key={image.url}
            image={image}
            variant="thumb"
            size="thumbnail"
            alt={`${match.displayName} — ${imageLabel ?? "Cultivar photo"}`}
            onImageError={onImageError}
          />
        ) : (
          <ImagePlaceholder />
        )}
        {row.price !== null ? (
          <span className="bg-background/90 absolute top-2 right-2 rounded-md px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur">
            {formatPrice(row.price)}
          </span>
        ) : null}
        <span className="bg-background/90 text-foreground absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full border shadow-sm backdrop-blur">
          <Info aria-hidden="true" className="size-3.5" />
        </span>
      </button>
      <div className="space-y-2 p-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm leading-tight font-semibold">
            {match.displayName}
          </h3>
          <p className="text-muted-foreground mt-1 truncate text-xs">
            {getCandidateMeta(match) || "Registered cultivar"}
          </p>
        </div>
        {sellerDescription ? (
          <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
            {sellerDescription}
          </p>
        ) : null}
        {databaseDescription ? (
          <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
            {databaseDescription}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function getCatalogPreviewBloomHabit(match: CultivarMatchCandidate) {
  const values = splitFacetValue(match.bloomHabit);
  if (
    match.rebloom === true &&
    !values.some((value) => value.toLowerCase() === "reblooms")
  ) {
    values.push("Reblooms");
  }
  return values.join("|") || null;
}

export function CatalogImporterCatalogPreview({
  columnFilters,
  controller,
  globalFilter,
  onColumnFiltersChange,
  onGlobalFilterChange,
  onOpenReview,
}: {
  columnFilters: ColumnFiltersState;
  controller: CatalogImporterWorkbenchController;
  globalFilter: string;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  onGlobalFilterChange: OnChangeFn<string>;
  onOpenReview: (row: CatalogImportRow) => void;
}) {
  const [mode, setMode] = useState<PublicCatalogSearchMode>("basic");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [detailsRowId, setDetailsRowId] = useState<string | null>(null);
  const [listingAreaScrolled, setListingAreaScrolled] = useState(false);
  const [searchPanelRequested, setSearchPanelRequested] = useState(false);
  const listingAreaRef = useRef<HTMLDivElement>(null);

  const linkedRows = useMemo(
    () =>
      [...controller.includedRows.filter(isCatalogPreviewRow)].sort(
        (left, right) => {
          if (left.id === controller.lastLinkAction?.rowId) return -1;
          if (right.id === controller.lastLinkAction?.rowId) return 1;
          return 0;
        },
      ),
    [controller.includedRows, controller.lastLinkAction?.rowId],
  );
  const previewListings = useMemo<CatalogImporterPreviewListing[]>(
    () =>
      linkedRows.map((row) => {
        const match = row.match!;
        const image = getCatalogPreviewImage(row);

        return {
          ahsListing: {
            awardNames: match.awardNames ?? null,
            bloomHabit: getCatalogPreviewBloomHabit(match),
            bloomSeason: match.bloomSeason,
            bloomSize: match.bloomSizeIn,
            branches: match.branches ?? null,
            budcount: match.budCount ?? null,
            color: match.color,
            foliageType: match.foliageType ?? null,
            flowerShow: match.flowerShow ?? null,
            form: match.form,
            fragrance: match.fragrance ?? null,
            hybridizer: match.hybridizer,
            parentage: match.parentage ?? null,
            ploidy: match.ploidy,
            scapeHeight: match.scapeHeightIn,
            sculptedTypes: match.sculptedTypes ?? null,
            year: match.year,
          },
          cultivarReference: {
            ahsListing: { name: match.displayName },
            normalizedName: match.normalizedName,
          },
          description: getCatalogPreviewDescription(row),
          images: image ? [image] : [],
          importRow: row,
          lists: [],
          price: row.price,
          title: match.displayName,
        };
      }),
    [linkedRows],
  );
  const toolbarFilterIds = useMemo(() => {
    const filterIds: string[] = [];
    if (linkedRows.some((row) => row.price !== null)) filterIds.push("price");
    if (linkedRows.some((row) => getCatalogPreviewImage(row) !== null)) {
      filterIds.push("hasPhoto");
    }
    return filterIds;
  }, [linkedRows]);
  const facetOptions = useMemo(
    () => buildPublicCatalogSearchFacetOptions(previewListings),
    [previewListings],
  );
  const showSearchPanel =
    previewListings.length > 6 ||
    columnFilters.length > 0 ||
    Boolean(globalFilter) ||
    searchPanelRequested;
  const intentionallyUnmatchedCount = controller.includedRows.filter(
    (row) => row.linkState === "intentionally-unmatched",
  ).length;
  // TanStack Table's hook intentionally returns mutable APIs; React Compiler warning is expected here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...defaultTableConfig<CatalogImporterPreviewListing>(),
    columns: PREVIEW_SEARCH_COLUMNS,
    data: previewListings,
    state: {
      columnFilters,
      globalFilter,
    },
    onColumnFiltersChange,
    onGlobalFilterChange,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: PREVIEW_PAGE_SIZE,
      },
    },
    meta: {
      filterableColumns: CATALOG_IMPORTER_PREVIEW_FILTER_IDS,
      getColumnLabel: (columnId) => columnId,
      pinnedColumns: { left: [], right: [] },
      storageKey: "catalog-importer-preview",
    },
  });
  const filteredRows = table
    .getFilteredRowModel()
    .rows.map((row) => row.original.importRow);
  const visiblePreviewRows = table
    .getPaginationRowModel()
    .rows.map((row) => row.original.importRow);
  const canShowMore = visiblePreviewRows.length < filteredRows.length;
  const detailsRow =
    controller.includedRows.find((row) => row.id === detailsRowId) ?? null;

  function returnToListingTop() {
    const listingArea = listingAreaRef.current;
    if (!listingArea) return;
    const behavior = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";

    if (listingArea.scrollHeight > listingArea.clientHeight) {
      listingArea.scrollTo({ behavior, top: 0 });
      return;
    }

    listingArea.scrollIntoView({ behavior, block: "start" });
  }

  return (
    <section
      id="catalog-importer-preview"
      aria-labelledby="catalog-importer-preview-heading"
      className="!scroll-mt-16 space-y-3 overflow-clip"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="catalog-importer-preview-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Your catalog preview
          </h2>
          {linkedRows.length < controller.includedRows.length ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {linkedRows.length.toLocaleString()} of{" "}
              {controller.includedRows.length.toLocaleString()} listings are
              linked and shown.
              {controller.reviewRows.length > 0 ? (
                <>
                  {" "}
                  <a
                    href="#catalog-importer-review-quiz"
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {controller.reviewRows.length.toLocaleString()} still need
                    {controller.reviewRows.length === 1 ? "s" : ""} a cultivar
                    decision.
                  </a>
                </>
              ) : null}
              {intentionallyUnmatchedCount > 0 ? (
                <>
                  {" "}
                  {intentionallyUnmatchedCount.toLocaleString()}{" "}
                  {intentionallyUnmatchedCount === 1 ? "is" : "are"} left
                  unmatched.
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        {!showSearchPanel && previewListings.length > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSearchPanelRequested(true)}
          >
            Search and filter
          </Button>
        ) : null}
      </div>

      <div
        className={
          !showSearchPanel
            ? undefined
            : panelCollapsed
              ? "grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]"
              : "grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]"
        }
      >
        {showSearchPanel ? (
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PublicCatalogSearchAdvancedPanel
              table={table}
              listOptions={PREVIEW_LIST_OPTIONS}
              facetOptions={facetOptions}
              mode={mode}
              onModeChange={setMode}
              collapsed={panelCollapsed}
              onCollapsedChange={setPanelCollapsed}
              showCultivarFacets
              toolbarFilterIds={toolbarFilterIds}
            />
          </div>
        ) : null}

        {filteredRows.length > 0 ? (
          <div className="min-w-0">
            <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs tabular-nums">
                Showing {visiblePreviewRows.length.toLocaleString()} of{" "}
                {filteredRows.length.toLocaleString()}
              </span>
              {listingAreaScrolled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={returnToListingTop}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                  Return to top
                </Button>
              ) : null}
            </div>

            <div
              ref={listingAreaRef}
              role="region"
              aria-label="Catalog listings"
              tabIndex={0}
              onScroll={(event) =>
                setListingAreaScrolled(event.currentTarget.scrollTop > 24)
              }
              className="bg-muted/10 max-h-[52rem] scroll-mt-24 overflow-y-auto overscroll-y-auto rounded-lg border p-3 pr-1 outline-none [scrollbar-gutter:stable] lg:max-h-[69rem] lg:pr-2 xl:max-h-[62rem]"
            >
              <div className="grid grid-cols-2 gap-3">
                {visiblePreviewRows.map((row) => {
                  return (
                    <div
                      key={row.id}
                      id={getCatalogPreviewRowId(row.id)}
                      className="scroll-mt-24"
                    >
                      <CatalogImporterListingCard
                        row={row}
                        highlighted={
                          controller.lastLinkAction?.rowId === row.id
                        }
                        onOpen={() => setDetailsRowId(row.id)}
                        onImageError={
                          row.imageUrl
                            ? () =>
                                controller.flagImageUrlIssue(
                                  row.id,
                                  row.imageUrl,
                                )
                            : undefined
                        }
                      />
                    </div>
                  );
                })}
              </div>

              {canShowMore ? (
                <div className="mt-4 flex items-start justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      table.setPageSize(
                        Math.min(
                          table.getState().pagination.pageSize +
                            PREVIEW_PAGE_SIZE,
                          filteredRows.length,
                        ),
                      )
                    }
                  >
                    Show more
                    <ChevronDown aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <Empty className="min-h-48 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImageIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyDescription>
                No linked cultivars match these filters.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                table.resetColumnFilters();
                table.resetGlobalFilter();
              }}
            >
              Clear filters
            </Button>
          </Empty>
        )}
      </div>

      <CatalogPreviewDetailsSheet
        row={detailsRow}
        onOpenReview={onOpenReview}
        onOpenChange={(open) => {
          if (!open) setDetailsRowId(null);
        }}
      />
    </section>
  );
}

function CatalogPreviewDetailsSheet({
  row,
  onOpenReview,
  onOpenChange,
}: {
  row: CatalogImportRow | null;
  onOpenReview: (row: CatalogImportRow) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const match = row?.match ?? null;
  const image = row ? getCatalogPreviewImage(row) : null;
  const imageLabel = row ? getCatalogPreviewImageLabel(row) : null;
  const description = row ? getCatalogPreviewDescription(row) : "";
  const ahsListing = match ? getCandidateAhsDisplayListing(match) : null;
  const cultivarRouteSegment = match
    ? toCultivarRouteSegment(match.normalizedName)
    : null;
  const cultivarHref = cultivarRouteSegment
    ? `/cultivar/${cultivarRouteSegment}`
    : null;

  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {row && match && ahsListing ? (
          <div className="space-y-5">
            <SheetHeader className="sr-only">
              <SheetTitle>{match.displayName}</SheetTitle>
              <SheetDescription>
                View listing and cultivar data.
              </SheetDescription>
            </SheetHeader>

            {image ? (
              <OptimizedImage
                image={image}
                variant="display"
                size="full"
                alt={`${match.displayName} — ${imageLabel ?? "Cultivar photo"}`}
                className="rounded-lg"
              />
            ) : (
              <div className="overflow-hidden rounded-lg">
                <ImagePlaceholder />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <H2>{match.displayName}</H2>
              </div>
              {row.price !== null ? (
                <P className="text-primary text-lg font-medium">
                  {formatPrice(row.price)}
                </P>
              ) : null}
            </div>

            {description ? (
              <P className="text-muted-foreground">{description}</P>
            ) : null}

            <Muted>Daylily Database Data</Muted>
            <AhsListingDisplay
              ahsListing={ahsListing}
              cultivarHref={cultivarHref}
            />

            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onOpenReview(row);
                }}
              >
                <Link2 aria-hidden="true" className="size-4" />
                Change cultivar match
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
