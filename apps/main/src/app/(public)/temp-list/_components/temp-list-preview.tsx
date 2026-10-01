"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { type ColumnFiltersState, useReactTable } from "@tanstack/react-table";
import { Download, Flower2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { CatalogListingCard } from "@/components/catalog-listing-card";
import { CatalogListingGrid } from "@/components/catalog-listing-grid";
import { PublicCatalogSearchAdvancedPanel } from "@/components/public-catalog-search/public-catalog-search-advanced-panel";
import { createPublicCatalogSearchColumns } from "@/components/public-catalog-search/public-catalog-search-columns";
import { buildPublicCatalogSearchFacetOptions } from "@/components/public-catalog-search/public-catalog-search-registry";
import type { PublicCatalogSearchMode } from "@/components/public-catalog-search/public-catalog-search-types";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCandidateMeta,
  getCultivarImage,
  getCultivarTraitSummary,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import { defaultTableConfig } from "@/lib/table-config";
import { downloadCatalogImportFile } from "@/lib/catalog-importer-file";
import { getCultivarShareImagePath } from "@/lib/social-card";
import { toCultivarRouteSegment } from "@/lib/utils/cultivar-utils";
import { formatPrice } from "@/lib/utils";
import {
  createTempListSpreadsheet,
  TEMP_TEXT_CARD_COLORS,
  type TempListing,
  type TempPreviewRow,
} from "../_lib/temp-list";
import { downloadTempListCards } from "../_lib/temp-list-downloads";

const columns = createPublicCatalogSearchColumns<TempPreviewRow>();
const filterIds = columns
  .map((column) => column.id)
  .filter((id): id is string => Boolean(id));

export function TempListPreview({
  rows,
  busy,
  onEdit,
}: {
  rows: TempPreviewRow[];
  busy: boolean;
  onEdit: (listing: TempListing) => void;
}) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [mode, setMode] = useState<PublicCatalogSearchMode>("basic");
  const [collapsed, setCollapsed] = useState(false);
  const [variant, setVariant] = useState<"print" | "share">("print");
  const [downloading, setDownloading] = useState<
    "spreadsheet" | "cards" | null
  >(null);
  const [completed, setCompleted] = useState(0);
  const [shown, setShown] = useState(18);
  const facetOptions = useMemo(
    () => buildPublicCatalogSearchFacetOptions(rows),
    [rows],
  );
  const table = useReactTable({
    ...defaultTableConfig<TempPreviewRow>(),
    columns,
    data: rows,
    state: { columnFilters, globalFilter },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      setShown(18);
    },
    onGlobalFilterChange: setGlobalFilter,
    meta: {
      filterableColumns: filterIds,
      getColumnLabel: (id) => id,
      pinnedColumns: { left: [], right: [] },
      storageKey: "temp-list-preview",
    },
  });
  const filtered = table.getFilteredRowModel().rows.map((row) => row.original);
  const visible = filtered.slice(0, shown);
  const missingDetails = filtered.some(
    ({ listing, match }) => listing.cultivarReferenceId && !match,
  );

  async function download(kind: "spreadsheet" | "cards") {
    setDownloading(kind);
    setCompleted(0);
    try {
      if (kind === "spreadsheet")
        await downloadCatalogImportFile({
          fileName: "temp-list.xlsx",
          spreadsheet: createTempListSpreadsheet(filtered),
        });
      else await downloadTempListCards(filtered, variant, setCompleted);
      toast.success(
        kind === "spreadsheet"
          ? "Spreadsheet downloaded."
          : "Card PDF downloaded.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The download failed. Try again.",
      );
    } finally {
      setDownloading(null);
    }
  }

  if (!rows.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Flower2 />
          </EmptyMedia>
          <EmptyTitle>Your temp list is empty</EmptyTitle>
          <EmptyDescription>
            Add names above, or add a listing manually. Then edit its price and
            notes, filter your list, and download it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-label="Temp list preview"
    >
      <PublicCatalogSearchAdvancedPanel
        advancedSectionsColumns={3}
        table={table}
        listOptions={[]}
        facetOptions={facetOptions}
        mode={mode}
        onModeChange={setMode}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        showCultivarFacets
        toolbarFilterIds={["price", "hasPhoto"]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm" role="status">
          {filtered.length} of {rows.length} listings · Downloads include the
          filtered list.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!filtered.length || busy || !!downloading}
            onClick={() => void download("spreadsheet")}
          >
            <Download data-icon="inline-start" />
            {downloading === "spreadsheet"
              ? "Preparing spreadsheet…"
              : "Download spreadsheet"}
          </Button>
          <Button
            disabled={
              !filtered.length || busy || missingDetails || !!downloading
            }
            onClick={() => void download("cards")}
          >
            <Download data-icon="inline-start" />
            {downloading === "cards"
              ? `Preparing ${completed}/${filtered.length}…`
              : "Download cards PDF"}
          </Button>
        </div>
      </div>
      <Tabs defaultValue="listings" className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="spreadsheet">Spreadsheet</TabsTrigger>
            <TabsTrigger value="cards">Detail cards</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Card style</span>
            <ToggleGroup
              type="single"
              variant="outline"
              value={variant}
              onValueChange={(value) => {
                if (value === "print" || value === "share") setVariant(value);
              }}
              aria-label="Card style"
            >
              <ToggleGroupItem value="print">Light</ToggleGroupItem>
              <ToggleGroupItem value="share">Dark</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {filtered.length === 0 ? (
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyTitle>No listings match these filters</EmptyTitle>
              <EmptyDescription>
                Clear the filters to see your full list.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              variant="outline"
              onClick={() => {
                setColumnFilters([]);
                setGlobalFilter("");
              }}
            >
              Clear filters
            </Button>
          </Empty>
        ) : null}
        <TabsContent value="listings" className="mt-4">
          <CatalogListingGrid>
            {visible.map(({ listing, match }) => (
              <CatalogListingCard.Root key={listing.id}>
                <CatalogListingCard.Action
                  aria-label={`Edit ${listing.name}`}
                  disabled={busy}
                  onClick={() => onEdit(listing)}
                />
                <CatalogListingCard.Media
                  image={getCultivarImage(match)}
                  alt={listing.name}
                >
                  <CatalogListingCard.Price price={listing.price} />
                </CatalogListingCard.Media>
                <CatalogListingCard.Content>
                  <CatalogListingCard.Title title={listing.name} />
                  <CatalogListingCard.Meta
                    text={
                      match
                        ? getCandidateMeta(match) || "Linked cultivar"
                        : listing.cultivarReferenceId
                          ? "Details unavailable"
                          : "No cultivar link"
                    }
                  />
                  <CatalogListingCard.Description
                    text={
                      listing.description ||
                      (match
                        ? getCultivarTraitSummary(match).join(" · ")
                        : "Edit this listing to link a cultivar or add your own details.")
                    }
                  />
                </CatalogListingCard.Content>
                <CatalogListingCard.Footer>
                  <span className="text-muted-foreground flex items-center gap-1 text-sm">
                    <Pencil className="size-3" aria-hidden="true" />
                    Edit listing
                  </span>
                </CatalogListingCard.Footer>
              </CatalogListingCard.Root>
            ))}
          </CatalogListingGrid>
        </TabsContent>
        <TabsContent value="spreadsheet" className="mt-4">
          <div className="bg-background overflow-hidden rounded-lg border">
            <Table className="min-w-192">
              <TableHeader>
                <TableRow>
                  {[
                    "Cultivar name",
                    "Price",
                    "Description",
                    "Private note",
                    "Hybridizer",
                    "Year",
                    "",
                  ].map((label, index) => (
                    <TableHead key={index}>
                      {label || <span className="sr-only">Actions</span>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(({ listing, match }) => (
                  <TableRow key={listing.id}>
                    <TableCell>{listing.name}</TableCell>
                    <TableCell>
                      {listing.price === null
                        ? "—"
                        : formatPrice(listing.price)}
                    </TableCell>
                    <TableCell className="max-w-xs break-words whitespace-pre-wrap">
                      {listing.description || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs break-words whitespace-pre-wrap">
                      {listing.privateNote || "—"}
                    </TableCell>
                    <TableCell>{match?.hybridizer ?? "—"}</TableCell>
                    <TableCell>{match?.year ?? "—"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`Edit ${listing.name}`}
                        onClick={() => onEdit(listing)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-muted-foreground border-t p-3 text-xs">
              The spreadsheet also includes cultivar IDs and all available
              registered details. Private notes are included in this download.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="cards" className="mt-4">
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              One flower per landscape page. Price and description appear below
              the image. Private notes are left out. Unlinked listings use a
              text card.
            </p>
            {visible.map(({ listing, match }) => (
              <article
                key={`${listing.id}-${variant}`}
                className="bg-background overflow-hidden rounded-lg border"
                aria-label={`${listing.name} detail card`}
              >
                {match ? (
                  // This is the complete, generated card. Next image optimization would add a second image transform.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="h-auto w-full"
                    width={1200}
                    height={630}
                    src={getCultivarShareImagePath(
                      toCultivarRouteSegment(match.normalizedName)!,
                      variant,
                    )}
                    alt={`${match.displayName} registered details and photo`}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex min-h-48 flex-col justify-center gap-2 bg-(--temp-card-background) p-8 text-(--temp-card-ink)"
                    style={
                      {
                        "--temp-card-background":
                          TEMP_TEXT_CARD_COLORS[variant].background,
                        "--temp-card-ink": TEMP_TEXT_CARD_COLORS[variant].ink,
                      } as CSSProperties
                    }
                  >
                    <h3 className="text-2xl font-semibold break-words">
                      {listing.name}
                    </h3>
                    <p>
                      {listing.cultivarReferenceId
                        ? "Registered details could not be loaded. Reload to try again."
                        : "No cultivar linked. Reference photo and registered details are unavailable."}
                    </p>
                  </div>
                )}
                {listing.price !== null || listing.description ? (
                  <div className="flex flex-col gap-2 border-t p-4">
                    {listing.price !== null ? (
                      <p className="font-semibold">
                        Price: {formatPrice(listing.price)}
                      </p>
                    ) : null}
                    {listing.description ? (
                      <p className="break-words whitespace-pre-wrap">
                        {listing.description}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`Edit ${listing.name}`}
                    onClick={() => onEdit(listing)}
                  >
                    <Pencil data-icon="inline-start" />
                    Edit listing
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      {visible.length < filtered.length ? (
        <Button
          variant="outline"
          className="self-center"
          onClick={() => setShown(shown + 18)}
        >
          Show more ({filtered.length - visible.length} remaining)
        </Button>
      ) : null}
    </section>
  );
}
