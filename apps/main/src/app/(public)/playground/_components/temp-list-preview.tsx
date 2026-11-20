"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Flower2, Pencil, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { CatalogListingCard } from "@/components/catalog-listing-card";
import { CatalogListingGrid } from "@/components/catalog-listing-grid";
import { PublicCatalogSearchAdvancedPanel } from "@/components/public-catalog-search/public-catalog-search-advanced-panel";
import {
  buildPublicCatalogSearchFacetOptions,
  buildPublicCatalogSearchListOptions,
} from "@/components/public-catalog-search/public-catalog-search-registry";
import type { PublicCatalogSearchMode } from "@/components/public-catalog-search/public-catalog-search-types";
import type { RowSelectionState } from "@tanstack/react-table";
import { CatalogListSelect } from "@/components/catalog-builder/catalog-list-select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCandidateMeta, getCultivarImage } from "@/lib/catalog-presentation";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDataTable } from "@/hooks/use-data-table";
import {
  DataTable,
  DataTablePagination,
  DataTableViewOptions,
} from "@/components/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import {
  getTempListColumns,
  tempListColumnNames,
  tempListVisibleColumns,
} from "./temp-list-columns";
import { downloadCatalogImportFile } from "@/lib/catalog-importer-file";
import {
  createTempListSpreadsheet,
  getTempDescription,
  type TempListing,
  type TempPreviewRow,
} from "../_lib/temp-list";
import { TempCatalogPrint } from "./temp-catalog-print";

export function TempListPreview({
  rows,
  busy,
  storageError,
  onEdit,
  onUpdate,
  onRemove,
  onAddToList,
}: {
  rows: TempPreviewRow[];
  busy: boolean;
  storageError: string | null;
  onEdit: (listing: TempListing) => void;
  onUpdate: (listing: TempListing) => boolean;
  onRemove: (ids: string[]) => boolean;
  onAddToList: (ids: string[], title: string) => boolean;
}) {
  const listNames = JSON.stringify(
    [...new Set(rows.flatMap((row) => row.listing.lists ?? []))].sort(),
  );
  // Keep cell components mounted when an edit does not change the list options.
  const lists = useMemo<string[]>(
    () => JSON.parse(listNames) as string[],
    [listNames],
  );
  const columns = useMemo(
    () =>
      getTempListColumns(
        onUpdate,
        (id) => onRemove([id]),
        lists,
        busy ? undefined : onEdit,
      ),
    [onUpdate, onRemove, lists, onEdit, busy],
  );
  const isMobile = useIsMobile();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [showSelected, setShowSelected] = useState(false);
  const selected = useMemo(
    () => rows.filter((row) => selection[row.listing.id]),
    [rows, selection],
  );
  const viewingSelected = showSelected && selected.length > 0;
  const [addingToList, setAddingToList] = useState(false);
  const [targetList, setTargetList] = useState<string[]>([]);
  const [view, setView] = useLocalStorage<"spreadsheet" | "listings">(
    "temp-catalog-view",
    "spreadsheet",
  );
  const [mode, setMode] = useLocalStorage<PublicCatalogSearchMode>(
    "temp-list-search-mode",
    "basic",
  );
  const [downloading, setDownloading] = useState(false);
  const [shown, setShown] = useState(18);
  const facetOptions = useMemo(
    () => buildPublicCatalogSearchFacetOptions(rows),
    [rows],
  );
  const table = useDataTable({
    columns,
    data: viewingSelected ? selected : rows,
    storageKey: "temp-list-inline-table",
    syncUrl: false,
    columnNames: tempListColumnNames,
    pinnedColumns: isMobile
      ? { left: [], right: [] }
      : { left: ["select", "images", "title"], right: ["actions"] },
    initialStateOverrides: {
      pagination: { pageIndex: 0, pageSize: 25 },
      columnVisibility: Object.fromEntries(
        columns.map((column) => [
          column.id!,
          tempListVisibleColumns.includes(column.id!),
        ]),
      ),
    },
    config: {
      getRowId: (row) => row.listing.id,
      autoResetPageIndex: true,
      state: { rowSelection: selection },
      onRowSelectionChange: setSelection,
      manualFiltering: viewingSelected,
    },
  });
  const filtered = table.getSortedRowModel().rows.map((row) => row.original);
  const visible = filtered.slice(0, shown);
  const missingDetails = filtered.some(
    ({ listing, match }) => listing.cultivarReferenceId && !match,
  );

  async function downloadSpreadsheet() {
    setDownloading(true);
    try {
      await downloadCatalogImportFile({
        fileName: "playground-catalog.xlsx",
        spreadsheet: createTempListSpreadsheet(filtered),
      });
      toast.success("Spreadsheet downloaded.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The download failed. Try again.",
      );
    } finally {
      setDownloading(false);
    }
  }

  if (!rows.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Flower2 />
          </EmptyMedia>
          <EmptyTitle>Your Playground catalog is empty</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );

  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-label="Playground catalog preview"
    >
      <div hidden={viewingSelected}>
        <PublicCatalogSearchAdvancedPanel
          advancedSectionsColumns={3}
          table={table}
          listOptions={buildPublicCatalogSearchListOptions(
            lists.map((title) => ({ id: title, title })),
            rows,
          )}
          facetOptions={facetOptions}
          mode={mode}
          onModeChange={setMode}
          showCultivarFacets
          toolbarFilterIds={["price", "hasPhoto", "lists"]}
        />
      </div>
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Bulk actions ({selected.length})
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={() => {
                    setTargetList([]);
                    setAddingToList(true);
                  }}
                >
                  Add to list
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (!onRemove(selected.map((row) => row.listing.id)))
                      return;
                    setSelection({});
                    setShowSelected(false);
                  }}
                >
                  Remove selected
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => {
              setShowSelected(!viewingSelected);
              table.firstPage();
            }}
          >
            {viewingSelected ? "Back to results" : "Show selected"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSelection({});
              setShowSelected(false);
            }}
          >
            Clear selection
          </Button>
        </div>
      ) : null}
      <Dialog open={addingToList} onOpenChange={setAddingToList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {selected.length} to list</DialogTitle>
            <DialogDescription className="sr-only">
              Choose or create a list for the selected listings.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto text-sm">
            {selected.map((row) => (
              <p key={row.listing.id} className="py-1">
                {row.listing.name}
              </p>
            ))}
          </div>
          <CatalogListSelect
            options={lists}
            values={targetList}
            onChange={setTargetList}
            multiple={false}
            label="Choose a list"
          />
          {storageError ? (
            <p role="alert" className="text-destructive text-sm">
              {storageError}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingToList(false)}>
              Cancel
            </Button>
            <Button
              disabled={!targetList.length}
              onClick={() => {
                if (
                  onAddToList(
                    selected.map((row) => row.listing.id),
                    targetList[0]!,
                  )
                )
                  setAddingToList(false);
              }}
            >
              Add to list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Tabs
        value={view}
        onValueChange={(value) => {
          if (value === "spreadsheet" || value === "listings") setView(value);
        }}
        className="min-w-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="spreadsheet">Spreadsheet</TabsTrigger>
            <TabsTrigger value="listings">Cards</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            <p
              className="text-muted-foreground text-sm tabular-nums"
              role="status"
            >
              {filtered.length} of {rows.length} listings
            </p>
            {view === "spreadsheet" ? (
              <DataTableViewOptions table={table} />
            ) : null}
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
                table.resetColumnFilters();
                table.setGlobalFilter("");
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
                    text={getTempDescription(listing, match)}
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
        {filtered.length > 0 ? (
          <TabsContent value="spreadsheet" className="mt-4">
            <DataTableLayout
              table={table}
              pagination={
                <DataTablePagination table={table} showSelectionCount={false} />
              }
            >
              <DataTable table={table} />
            </DataTableLayout>
          </TabsContent>
        ) : null}
      </Tabs>
      {view !== "spreadsheet" && visible.length < filtered.length ? (
        <Button
          variant="outline"
          className="self-center"
          onClick={() => setShown(shown + 18)}
        >
          Show more ({filtered.length - visible.length} remaining)
        </Button>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!filtered.length || busy || downloading}
          onClick={() => void downloadSpreadsheet()}
        >
          <Download data-icon="inline-start" />
          {downloading ? "Preparing spreadsheet…" : "Download spreadsheet"}
        </Button>
        <TempCatalogPrint
          key={JSON.stringify(
            filtered.map(({ listing, match }) => [
              listing.id,
              listing.name,
              listing.description,
              listing.price,
              listing.cultivarReferenceId,
              match?.normalizedName,
            ]),
          )}
          rows={filtered}
          disabled={!filtered.length || busy || missingDetails}
        />
      </div>
      <p className="text-muted-foreground max-w-prose text-sm">
        With a Pro membership, you can publish your catalog. Download the
        spreadsheet, then{" "}
        <Link
          href="/dashboard/imports"
          className="text-foreground underline underline-offset-4"
        >
          import it in your dashboard
        </Link>
        . Extra spreadsheet columns are not imported.
      </p>
    </section>
  );
}
