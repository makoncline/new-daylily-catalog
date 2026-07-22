"use client";

import { useId, useMemo, useState } from "react";
import { Check, Pencil, RotateCcw } from "lucide-react";
import { CatalogImporterSourceRow } from "@/app/(public)/catalog-importer/_components/catalog-importer-match-options";
import { OptimizedImage } from "@/components/optimized-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getCultivarImage } from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImportRow } from "@/lib/catalog-importer";
import { formatPrice } from "@/lib/utils";

const PAGE_SIZE = 50;

export type DashboardImportTableView =
  | "all"
  | "duplicates"
  | "excluded"
  | "ready"
  | "review";

interface DashboardImportTableProps {
  controller: CatalogImporterWorkbenchController;
  existingDuplicateCounts: ReadonlyMap<string, number>;
  onReviewRow: (row: CatalogImportRow) => void;
  rowIds?: ReadonlySet<string>;
  view: DashboardImportTableView;
}

function matchesView(
  row: CatalogImportRow,
  view: DashboardImportTableView,
  existingDuplicateCount: number,
) {
  switch (view) {
    case "duplicates":
      return row.duplicateOfSourceRow !== null || existingDuplicateCount > 0;
    case "excluded":
      return row.outputState === "removed";
    case "ready":
      return row.outputState === "included" && row.priceWarning === null;
    case "review":
      return row.outputState === "included" && row.linkState === "pending";
    default:
      return true;
  }
}

function ImportRowEditor({
  controller,
  onOpenChange,
  open,
  row,
}: {
  controller: CatalogImporterWorkbenchController;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: CatalogImportRow | null;
}) {
  const [values, setValues] = useState(() => ({
    description: row?.description ?? "",
    price:
      row?.price === null || row?.price === undefined ? "" : String(row.price),
    privateNote: row?.privateNote ?? "",
  }));

  if (!row) return null;

  const originalRow = controller.getOriginalImportRow(row.id);
  const numericPrice =
    values.price.trim() === "" ? null : Number(values.price);
  const parsedPrice = numericPrice === 0 ? null : numericPrice;
  const priceIsValid =
    numericPrice === null ||
    (Number.isFinite(numericPrice) &&
      numericPrice >= 0 &&
      Number.isInteger(numericPrice));
  const canRestore =
    originalRow !== null &&
    (parsedPrice !== originalRow.price ||
      values.description !== originalRow.description ||
      values.privateNote !== originalRow.privateNote);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-3xl">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Edit import row</SheetTitle>
          <SheetDescription>
            These changes apply to the new listing. The spreadsheet remains
            unchanged.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-6 py-5">
          <CatalogImporterSourceRow
            label="Original spreadsheet row"
            row={row}
            sourceCells={controller.getSourceCellsForRow(row)}
          />

          <FieldGroup className="gap-5">
            <Field data-invalid={!priceIsValid}>
              <FieldLabel htmlFor="dashboard-import-price">Price</FieldLabel>
              <Input
                id="dashboard-import-price"
                inputMode="numeric"
                value={values.price}
                aria-invalid={!priceIsValid}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
              />
              {!priceIsValid ? (
                <FieldError>
                  Price must be a whole number.
                </FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="dashboard-import-description">
                Description
              </FieldLabel>
              <Textarea
                id="dashboard-import-description"
                value={values.description}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="dashboard-import-private-note">
                Private note
              </FieldLabel>
              <Textarea
                id="dashboard-import-private-note"
                value={values.privateNote}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    privateNote: event.target.value,
                  }))
                }
              />
            </Field>
          </FieldGroup>
        </div>

        <SheetFooter className="mt-auto flex-row justify-between border-t px-6 py-4 sm:justify-between">
          {canRestore ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setValues({
                  description: originalRow.description,
                  price:
                    originalRow.price === null
                      ? ""
                      : String(originalRow.price),
                  privateNote: originalRow.privateNote,
                });
                controller.resetImportRow(row.id);
              }}
            >
              <RotateCcw />
              Restore spreadsheet values
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            disabled={!priceIsValid}
            onClick={() => {
              controller.updateImportRow(row.id, {
                description: values.description,
                price: parsedPrice,
                privateNote: values.privateNote,
              });
              onOpenChange(false);
            }}
          >
            <Check />
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function DashboardImportTable({
  controller,
  existingDuplicateCounts,
  onReviewRow,
  rowIds,
  view,
}: DashboardImportTableProps) {
  const tableId = useId();
  const [page, setPage] = useState(0);
  const [editingRow, setEditingRow] = useState<CatalogImportRow | null>(null);
  const rows = useMemo(
    () =>
      (controller.matchedRows ?? []).filter(
        (row) =>
          row.rowKind === "listing" &&
          (rowIds
            ? rowIds.has(row.id)
            : matchesView(row, view, existingDuplicateCounts.get(row.id) ?? 0)),
      ),
    [controller.matchedRows, existingDuplicateCounts, rowIds, view],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );
  const allVisibleRowsIncluded =
    visibleRows.length > 0 &&
    visibleRows.every((row) => row.outputState === "included");
  const showImage = rows.some((row) => getCultivarImage(row.match) !== null);
  const showCultivar = rows.some(
    (row) =>
      !row.match ||
      row.linkState !== "linked" ||
      row.match.displayName !== row.title,
  );
  const showPrice = rows.some(
    (row) => row.price !== null || row.priceWarning !== null,
  );
  const showDescription = rows.some((row) => row.description.trim().length > 0);
  const showPrivateNote = rows.some((row) => row.privateNote.trim().length > 0);
  const changePage = (nextPage: number) => {
    setPage(nextPage);
    requestAnimationFrame(() =>
      document.getElementById(tableId)?.scrollIntoView?.({ block: "start" }),
    );
  };

  return (
    <div id={tableId} className="scroll-mt-4 space-y-3">
      <div className="max-h-[42rem] overflow-auto rounded-md border">
        <Table className="block sm:table">
          <TableHeader className="bg-background sticky top-0 z-10 hidden sm:table-header-group">
            <TableRow>
              <TableHead className="w-12">Include</TableHead>
              {showImage ? <TableHead className="w-16">Image</TableHead> : null}
              <TableHead>Name</TableHead>
              {showCultivar ? <TableHead>Cultivar</TableHead> : null}
              {showPrice ? <TableHead>Price</TableHead> : null}
              {showDescription ? <TableHead>Description</TableHead> : null}
              {showPrivateNote ? <TableHead>Private note</TableHead> : null}
              <TableHead className="w-14">
                <span className="sr-only">Edit</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="block sm:table-row-group">
            {visibleRows.map((row) => {
              const image = getCultivarImage(row.match);
              const existingDuplicateCount =
                existingDuplicateCounts.get(row.id) ?? 0;
              const included = row.outputState === "included";

              return (
                <TableRow
                  key={row.id}
                  className={`grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-x-3 gap-y-1 px-3 py-3 sm:table-row sm:p-0 ${
                    included ? "" : "opacity-55"
                  }`}
                >
                  <TableCell className="col-start-1 row-start-1 p-0 pt-1 sm:table-cell sm:p-2">
                    <Checkbox
                      checked={included}
                      aria-label={`Include ${row.title}`}
                      onCheckedChange={(checked) =>
                        controller.setImportRowIncluded(
                          row.id,
                          checked === true,
                        )
                      }
                    />
                  </TableCell>
                  {showImage ? (
                    <TableCell className="col-start-2 row-start-1 p-0 sm:table-cell sm:p-2">
                      {image ? (
                        <OptimizedImage
                          image={image}
                          alt={`${row.match?.displayName ?? row.title} reference photo`}
                          className="size-12 rounded-md border"
                          variant="thumb"
                        />
                      ) : null}
                    </TableCell>
                  ) : null}
                  <TableCell
                    className={`col-start-2 max-w-56 p-0 align-top font-medium sm:table-cell sm:p-2 ${
                      showImage ? "row-start-2" : "row-start-1"
                    }`}
                  >
                    <span className="line-clamp-2" title={row.title}>
                      {row.title}
                    </span>
                    <span className="text-muted-foreground mt-1 block font-mono text-xs">
                      Row {row.sourceRow}
                    </span>
                    {row.duplicateOfSourceRow !== null ? (
                      <span className="text-muted-foreground mt-1 block text-xs">
                        Also linked on row {row.duplicateOfSourceRow}
                      </span>
                    ) : null}
                    {existingDuplicateCount > 0 ? (
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {existingDuplicateCount} existing listing
                        {existingDuplicateCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </TableCell>
                  {showCultivar ? (
                    <TableCell className="col-start-2 flex max-w-52 gap-2 p-0 align-top sm:table-cell sm:p-2">
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground w-24 shrink-0 font-normal sm:hidden"
                      >
                        Cultivar
                      </span>
                      {row.match ? (
                        <span
                          className="line-clamp-2"
                          title={row.match.displayName}
                        >
                          {row.match.displayName}
                        </span>
                      ) : row.linkState === "intentionally-unmatched" ? (
                        <span className="text-muted-foreground">Unlinked</span>
                      ) : (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0"
                          onClick={() => onReviewRow(row)}
                        >
                          Review match
                        </Button>
                      )}
                    </TableCell>
                  ) : null}
                  {showPrice ? (
                    <TableCell className="col-start-2 flex gap-2 p-0 align-top tabular-nums sm:table-cell sm:p-2">
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground w-24 shrink-0 font-normal sm:hidden"
                      >
                        Price
                      </span>
                      {row.priceWarning ? (
                        <span className="text-destructive">Review</span>
                      ) : row.price === null ? (
                        "—"
                      ) : (
                        formatPrice(row.price)
                      )}
                    </TableCell>
                  ) : null}
                  {showDescription ? (
                    <TableCell className="col-start-2 flex max-w-72 gap-2 p-0 align-top sm:table-cell sm:p-2">
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground w-24 shrink-0 font-normal sm:hidden"
                      >
                        Description
                      </span>
                      <span className="line-clamp-3" title={row.description}>
                        {row.description || "—"}
                      </span>
                    </TableCell>
                  ) : null}
                  {showPrivateNote ? (
                    <TableCell className="col-start-2 flex max-w-56 gap-2 p-0 align-top sm:table-cell sm:p-2">
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground w-24 shrink-0 font-normal sm:hidden"
                      >
                        Private note
                      </span>
                      <span className="line-clamp-3" title={row.privateNote}>
                        {row.privateNote || "—"}
                      </span>
                    </TableCell>
                  ) : null}
                  <TableCell className="col-start-3 row-start-1 p-0 align-top sm:table-cell sm:p-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${row.title}`}
                      onClick={() => setEditingRow(row)}
                    >
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 || !allVisibleRowsIncluded ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              {rows.length.toLocaleString()} row{rows.length === 1 ? "" : "s"}
            </span>
            {!allVisibleRowsIncluded ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={visibleRows.length === 0}
                title="Include all rows shown on this page"
                onClick={() =>
                  controller.setImportRowsIncluded(
                    visibleRows.map((row) => row.id),
                    true,
                  )
                }
              >
                Include all
              </Button>
            ) : null}
          </div>
          {pageCount > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => changePage(Math.max(0, currentPage - 1))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground tabular-nums">
                {currentPage + 1} of {pageCount}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage >= pageCount - 1}
                onClick={() =>
                  changePage(Math.min(pageCount - 1, currentPage + 1))
                }
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <ImportRowEditor
        key={editingRow?.id ?? "closed"}
        controller={controller}
        open={editingRow !== null}
        row={editingRow}
        onOpenChange={(open) => !open && setEditingRow(null)}
      />
    </div>
  );
}
