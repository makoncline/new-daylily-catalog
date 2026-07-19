"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useReactTable } from "@tanstack/react-table";
import {
  ArrowUp,
  ChevronDown,
  ExternalLink,
  ImageIcon,
  Link2,
} from "lucide-react";
import { ImageGallery } from "@/components/image-gallery";
import { ImagePlaceholder } from "@/components/image-placeholder";
import type { OptimizedImageSource } from "@/components/optimized-image";
import { OptimizedImage } from "@/components/optimized-image";
import { PublicCatalogSearchAdvancedPanel } from "@/components/public-catalog-search/public-catalog-search-advanced-panel";
import {
  type CatalogSearchListingRow,
  createPublicCatalogSearchColumns,
} from "@/components/public-catalog-search/public-catalog-search-columns";
import { buildPublicCatalogSearchFacetOptions } from "@/components/public-catalog-search/public-catalog-search-registry";
import type {
  PublicCatalogSearchFacetOption,
  PublicCatalogSearchMode,
} from "@/components/public-catalog-search/public-catalog-search-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { getCultivarUrl, type CatalogImportRow } from "@/lib/catalog-importer";
import { defaultTableConfig } from "@/lib/table-config";
import { cn, formatPrice } from "@/lib/utils";

const PREVIEW_PAGE_SIZE = 20;

interface CatalogImporterPreviewListing extends CatalogSearchListingRow {
  importRow: CatalogImportRow;
}

const PREVIEW_SEARCH_COLUMNS =
  createPublicCatalogSearchColumns<CatalogImporterPreviewListing>();
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

  return row.match ? getCultivarTraitSummary(row.match).join(" · ") : "";
}

function CatalogPreviewImage({
  cultivarName,
  image,
  imageLabel,
  onImageError,
}: {
  cultivarName: string;
  image: OptimizedImageSource;
  imageLabel: string;
  onImageError?: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Preview ${cultivarName} image`}
          className="block w-full cursor-zoom-in"
        >
          <OptimizedImage
            image={image}
            variant="thumb"
            size="thumbnail"
            alt={cultivarName}
            onImageError={onImageError}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle className="sr-only">{cultivarName} image</DialogTitle>
        <DialogDescription className="sr-only">
          Display-size {imageLabel.toLowerCase()}
        </DialogDescription>
        <ImageGallery
          images={[{ ...image, alt: cultivarName }]}
          listingName={cultivarName}
        />
      </DialogContent>
    </Dialog>
  );
}

function CatalogPreviewDescription({
  cultivarName,
  text,
}: {
  cultivarName: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`Show full description for ${cultivarName}`}
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring line-clamp-3 w-full rounded-sm text-left text-xs leading-relaxed outline-none focus-visible:ring-2"
        >
          {text}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-sm text-xs leading-relaxed text-pretty"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function CatalogImporterCatalogPreview({
  controller,
  onOpenReview,
}: {
  controller: CatalogImporterWorkbenchController;
  onOpenReview: (row: CatalogImportRow) => void;
}) {
  const [mode, setMode] = useState<PublicCatalogSearchMode>("basic");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
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
            bloomHabit:
              match.bloomHabit ?? (match.rebloom === true ? "Reblooms" : null),
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
  const facetOptions = useMemo(
    () => buildPublicCatalogSearchFacetOptions(previewListings),
    [previewListings],
  );
  // TanStack Table's hook intentionally returns mutable APIs; React Compiler warning is expected here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    ...defaultTableConfig<CatalogImporterPreviewListing>(),
    columns: PREVIEW_SEARCH_COLUMNS,
    data: previewListings,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: PREVIEW_PAGE_SIZE,
      },
    },
    meta: {
      filterableColumns: PREVIEW_SEARCH_COLUMNS.map(
        (column) => column.id,
      ).filter((id): id is string => Boolean(id)),
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

  function returnToListingTop() {
    const listingArea = listingAreaRef.current;
    if (!listingArea) return;

    if (listingArea.scrollHeight > listingArea.clientHeight) {
      listingArea.scrollTo({ behavior: "smooth", top: 0 });
      return;
    }

    listingArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      id="catalog-importer-preview"
      aria-labelledby="catalog-importer-preview-heading"
      className="scroll-mt-4 space-y-4"
    >
      <div>
        <h2
          id="catalog-importer-preview-heading"
          className="text-xl font-semibold tracking-tight"
        >
          Your catalog preview
        </h2>
        <p className="text-muted-foreground text-sm">
          A customer-facing preview of the cultivars linked so far.
        </p>
      </div>

      {controller.counts.pendingCultivarDecisionCount > 0 ? (
        <div className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {controller.counts.pendingCultivarDecisionCount.toLocaleString()}{" "}
            additional{" "}
            {controller.counts.pendingCultivarDecisionCount === 1
              ? "listing is"
              : "listings are"}{" "}
            waiting for a cultivar decision. Link{" "}
            {controller.counts.pendingCultivarDecisionCount === 1
              ? "it"
              : "them"}{" "}
            to add reference photos and cultivar details.
          </p>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href="#catalog-importer-review-quiz">Review names</a>
          </Button>
        </div>
      ) : null}

      <div
        className={
          panelCollapsed
            ? "grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]"
            : "grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]"
        }
      >
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
          />
        </div>

        {filteredRows.length > 0 ? (
          <div className="min-w-0">
            <div className="pointer-events-none sticky top-0 z-20 mx-2 flex h-0 translate-y-[calc(100vh-8rem)] items-center justify-between gap-3">
              <span className="bg-background/95 text-muted-foreground rounded-full border px-3 py-2 text-xs tabular-nums shadow-sm backdrop-blur">
                Showing {visiblePreviewRows.length.toLocaleString()} of{" "}
                {filteredRows.length.toLocaleString()}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-background/95 pointer-events-auto rounded-full shadow-md backdrop-blur"
                onClick={returnToListingTop}
              >
                <ArrowUp aria-hidden="true" className="size-4" />
                Return to top
              </Button>
            </div>

            <div
              ref={listingAreaRef}
              role="region"
              aria-label="Catalog listings"
              tabIndex={0}
              className="max-h-[52rem] scroll-mt-24 overflow-y-auto overscroll-contain pr-1 outline-none lg:max-h-[69rem] lg:pr-2 xl:max-h-[62rem]"
            >
              <TooltipProvider delayDuration={250}>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {visiblePreviewRows.map((row) => {
                    const match = row.match!;
                    const image = getCatalogPreviewImage(row);
                    const imageLabel = getCatalogPreviewImageLabel(row);
                    const description = getCatalogPreviewDescription(row);

                    return (
                      <article
                        key={row.id}
                        id={getCatalogPreviewRowId(row.id)}
                        className={cn(
                          "bg-card scroll-mt-24 overflow-hidden rounded-lg border transition-shadow",
                          controller.lastLinkAction?.rowId === row.id &&
                            "ring-primary ring-2 ring-offset-2",
                        )}
                      >
                        <div className="relative">
                          {image ? (
                            <CatalogPreviewImage
                              key={image.url}
                              image={image}
                              imageLabel={imageLabel ?? "Cultivar photo"}
                              cultivarName={match.displayName}
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
                          ) : (
                            <ImagePlaceholder />
                          )}
                          {imageLabel ? (
                            <span className="bg-background/90 text-muted-foreground absolute top-2 left-2 rounded px-2 py-1 text-[0.6875rem] shadow-sm backdrop-blur">
                              {imageLabel}
                            </span>
                          ) : null}
                          {row.price !== null ? (
                            <span className="bg-background/90 absolute top-2 right-2 rounded-md px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur">
                              {formatPrice(row.price)}
                            </span>
                          ) : null}
                          <Link
                            href={getCultivarUrl(match)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${match.displayName} cultivar page`}
                            title="Open cultivar page"
                            className="bg-background/90 text-foreground hover:bg-background focus-visible:ring-ring absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full border shadow-sm backdrop-blur outline-none focus-visible:ring-2"
                          >
                            <ExternalLink
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          </Link>
                        </div>
                        <div className="space-y-2 p-3">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-2 text-sm leading-tight font-semibold">
                                {match.displayName}
                              </h3>
                              <p className="text-muted-foreground mt-1 truncate text-xs">
                                {getCandidateMeta(match) ||
                                  "Registered cultivar"}
                              </p>
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="-mt-1 -mr-1 size-8 shrink-0"
                                  aria-label={`Change cultivar match for ${row.sourceTitle}`}
                                  onClick={() => onOpenReview(row)}
                                >
                                  <Link2
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Change cultivar match
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          {description ? (
                            <CatalogPreviewDescription
                              cultivarName={match.displayName}
                              text={description}
                            />
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </TooltipProvider>

              <div className="mt-4 flex min-h-20 items-start justify-center border-t pt-4">
                {canShowMore ? (
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
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-sm">
            <ImageIcon aria-hidden="true" className="size-8" />
            <p>No linked cultivars match these filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
