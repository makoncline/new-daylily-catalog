"use client";

import { type ComponentProps, useMemo, useState } from "react";
import { CircleMinus, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import {
  isCatalogImportImagePreviewWarning,
  type CatalogImportRow,
} from "@/lib/catalog-importer";
import { cn } from "@/lib/utils";

interface DuplicateGroup {
  id: string;
  rows: CatalogImportRow[];
}

type ParsedInput<T> = { valid: true; value: T } | { valid: false; value: null };

// Seller image transfer is intentionally outside the importer MVP. Keep the
// existing repair helpers dormant until image ownership and upload are handled
// by the dashboard image flow.
const SHOW_IMAGE_ISSUES = false;

function IssueTable({
  className,
  containerClassName,
  ...props
}: ComponentProps<typeof Table> & { containerClassName?: string }) {
  return (
    <div
      className={cn(
        "max-w-full overflow-hidden rounded-md border",
        containerClassName,
      )}
      data-slot="catalog-importer-issue-table"
    >
      <Table className={className} {...props} />
    </div>
  );
}

function getDuplicateGroups(rows: CatalogImportRow[]) {
  const rowsBySourceRow = new Map(rows.map((row) => [row.sourceRow, row]));
  const groups = new Map<number, CatalogImportRow[]>();

  for (const row of rows) {
    if (row.duplicateOfSourceRow === null) {
      continue;
    }

    const firstRow = rowsBySourceRow.get(row.duplicateOfSourceRow);
    if (!firstRow) {
      continue;
    }

    const group = groups.get(firstRow.sourceRow) ?? [firstRow];
    group.push(row);
    groups.set(firstRow.sourceRow, group);
  }

  return [...groups.entries()].map(
    ([sourceRow, duplicateRows]): DuplicateGroup => ({
      id: `source-row-${sourceRow}:duplicate-group`,
      rows: duplicateRows,
    }),
  );
}

function parsePrice(value: string): ParsedInput<number | null> {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: true, value: null };
  }

  const normalized = trimmed.replaceAll(",", "").replace(/^\$/, "");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { valid: false, value: null };
  }

  const price = Number(normalized);
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(price)) {
    return { valid: false, value: null };
  }

  return { valid: true, value: price === 0 ? null : price };
}

function parseImageUrl(value: string): ParsedInput<string> {
  const normalized = value.trim();
  if (!normalized) {
    return { valid: true, value: "" };
  }

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:"
      ? { valid: true, value: url.toString() }
      : { valid: false, value: null };
  } catch {
    return { valid: false, value: null };
  }
}

function ExcludeRowButton({
  destination,
  onClick,
  sourceRow,
}: {
  destination: "import" | "workbook";
  onClick: () => void;
  sourceRow: number;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      aria-label={`Exclude row ${sourceRow} from ${destination}`}
      onClick={onClick}
    >
      <Trash2 aria-hidden="true" data-icon="inline-start" />
      Exclude row
    </Button>
  );
}

function DuplicateGroupActions({
  count,
  onExclude,
  onKeep,
}: {
  count: number;
  onExclude: () => void;
  onKeep: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={onKeep}>
        Keep {count.toLocaleString()}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={onExclude}
      >
        Exclude {count.toLocaleString()}
      </Button>
    </div>
  );
}

function DuplicateGroupTable({
  controller,
  destination,
  rows,
}: {
  controller: CatalogImporterWorkbenchController;
  destination: "import" | "workbook";
  rows: CatalogImportRow[];
}) {
  const sourceRows = rows.map((row) => ({
    row,
    sourceCells: controller.getSourceCellsForRow(row),
  }));
  const columns = sourceRows[0]?.sourceCells ?? [];
  const title = rows[0]?.title ?? "this cultivar";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">Multiple listings for {title}</h4>
        <DuplicateGroupActions
          count={rows.length}
          onKeep={() => controller.keepDuplicateRows(rows.map((row) => row.id))}
          onExclude={() =>
            controller.excludeDuplicateRows(rows.map((row) => row.id))
          }
        />
      </div>

      <IssueTable
        aria-label={`Duplicate rows for ${title}`}
        className="min-w-0 md:w-max md:min-w-full"
      >
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            <TableHead scope="col" className="w-px">
              Row
            </TableHead>
            {columns.map((column) => (
              <TableHead
                key={column.column}
                scope="col"
                className="min-w-32 align-bottom whitespace-normal"
              >
                {!column.mapped ? (
                  <span className="text-muted-foreground block font-mono text-[0.6875rem] font-normal">
                    {column.column}
                  </span>
                ) : null}
                {column.label}
              </TableHead>
            ))}
            <TableHead scope="col" className="w-px">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sourceRows.map(({ row, sourceCells }) => (
            <TableRow
              key={row.id}
              className="grid gap-3 py-4 md:table-row md:py-0"
            >
              <TableHead
                scope="row"
                className="text-muted-foreground flex h-auto font-mono text-xs font-normal md:table-cell"
              >
                <span className="md:hidden">Row </span>
                {row.sourceRow}
              </TableHead>
              {sourceCells.map((cell) => (
                <TableCell
                  key={cell.column}
                  className="max-w-80 p-0 align-top whitespace-normal md:table-cell md:p-2"
                >
                  <span className="text-muted-foreground mb-1 block text-xs font-medium md:hidden">
                    {cell.label}
                  </span>
                  {cell.value || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              ))}
              <TableCell className="p-0 md:table-cell md:p-2">
                <ExcludeRowButton
                  destination={destination}
                  sourceRow={row.sourceRow}
                  onClick={() => controller.removeDuplicateRow(row.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </IssueTable>
    </div>
  );
}

function PriceIssuesTable({
  controller,
  destination,
  rows,
}: {
  controller: CatalogImporterWorkbenchController;
  destination: "import" | "workbook";
  rows: CatalogImportRow[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, row.sourcePrice])),
  );
  const parsedRows = rows.map((row) => {
    const parsed = parsePrice(values[row.id] ?? row.sourcePrice);
    return {
      canSave: parsed.valid,
      parsed,
      row,
    };
  });
  const canSaveAll = parsedRows.every(({ canSave }) => canSave);

  return (
    <section aria-labelledby="catalog-importer-price-issues-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="catalog-importer-price-issues-heading"
          className="font-semibold"
        >
          Price formats need review
        </h3>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Remove all invalid prices
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Remove prices from {rows.length.toLocaleString()} listings?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Their original price text will be kept in the private note.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    controller.resolvePriceIssues(
                      rows.map((row) => ({
                        preserveOriginalOffer: true,
                        price: null,
                        rowId: row.id,
                      })),
                    )
                  }
                >
                  Remove prices
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canSaveAll}
            onClick={() =>
              controller.resolvePriceIssues(
                parsedRows.flatMap(({ canSave, parsed, row }) =>
                  canSave
                    ? [
                        {
                          preserveOriginalOffer: false,
                          price: parsed.value,
                          rowId: row.id,
                        },
                      ]
                    : [],
                ),
              )
            }
          >
            Save all
          </Button>
        </div>
      </div>

      <IssueTable
        aria-label="Price format rows"
        className="min-w-0 md:min-w-[34rem]"
        containerClassName="mt-3"
      >
        <TableHeader className="hidden md:table-header-group">
          <TableRow>
            <TableHead scope="col" className="w-px">
              Row
            </TableHead>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col">Invalid price</TableHead>
            <TableHead scope="col" className="w-40">
              New price
            </TableHead>
            <TableHead scope="col" className="w-px">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parsedRows.map(({ canSave, parsed, row }) => (
            <TableRow
              key={row.id}
              className="grid grid-cols-2 gap-x-3 gap-y-3 py-4 md:table-row md:py-0"
            >
              <TableHead
                scope="row"
                className="text-muted-foreground col-span-2 flex h-auto items-baseline gap-2 p-0 font-mono text-xs font-normal md:table-cell md:p-2"
              >
                <span className="md:hidden">Row {row.sourceRow}</span>
                <span className="hidden md:inline">{row.sourceRow}</span>
                <span className="text-foreground font-sans text-sm font-medium md:hidden">
                  {row.sourceTitle}
                </span>
              </TableHead>
              <TableCell className="hidden p-0 font-medium md:table-cell md:p-2">
                {row.sourceTitle}
              </TableCell>
              <TableCell className="text-muted-foreground min-w-0 p-0 md:table-cell md:p-2">
                <span className="mb-1 block text-xs font-medium md:hidden">
                  Invalid price
                </span>
                <span className="break-words">{row.sourcePrice}</span>
              </TableCell>
              <TableCell className="min-w-0 p-0 md:table-cell md:p-2">
                <span className="text-muted-foreground mb-1 block text-xs font-medium md:hidden">
                  New price
                </span>
                <InputGroup className="h-8 md:w-40">
                  <InputGroupInput
                    aria-label={`Correct price for row ${row.sourceRow}`}
                    aria-invalid={!parsed.valid}
                    aria-describedby={
                      !parsed.valid
                        ? `catalog-importer-price-message-${row.sourceRow}`
                        : undefined
                    }
                    inputMode="numeric"
                    className="h-8"
                    value={values[row.id] ?? row.sourcePrice}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setValues((current) => ({
                        ...current,
                        [row.id]: value,
                      }));
                    }}
                  />
                  <InputGroupAddon align="inline-end" className="pr-1">
                    <InputGroupButton
                      size="icon-xs"
                      disabled={!canSave}
                      aria-label={`Save price for row ${row.sourceRow}`}
                      title={`Save price for row ${row.sourceRow}`}
                      onClick={() => {
                        if (canSave && parsed.valid) {
                          controller.resolvePriceIssues([
                            {
                              preserveOriginalOffer: false,
                              price: parsed.value,
                              rowId: row.id,
                            },
                          ]);
                        }
                      }}
                    >
                      <Save className="size-4" />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {!parsed.valid ? (
                  <p
                    id={`catalog-importer-price-message-${row.sourceRow}`}
                    className="text-destructive mt-1 text-xs"
                  >
                    Price must be a whole number.
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="col-span-2 flex flex-wrap items-center gap-1 p-0 md:table-cell md:space-x-1 md:p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove price from row ${row.sourceRow}`}
                  onClick={() =>
                    controller.resolvePriceIssues([
                      {
                        preserveOriginalOffer: true,
                        price: null,
                        rowId: row.id,
                      },
                    ])
                  }
                >
                  <CircleMinus className="size-4" />
                  Remove price
                </Button>
                <ExcludeRowButton
                  destination={destination}
                  sourceRow={row.sourceRow}
                  onClick={() => controller.excludeIssueRows([row.id])}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </IssueTable>
    </section>
  );
}

function ImageUrlIssuesTable({
  controller,
  rows,
}: {
  controller: CatalogImporterWorkbenchController;
  rows: CatalogImportRow[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, row.sourceImageUrl])),
  );
  const parsedRows = rows.map((row) => ({
    parsed: parseImageUrl(values[row.id] ?? row.sourceImageUrl),
    row,
  }));
  const canSaveAll = parsedRows.every(({ parsed }) => parsed.valid);

  return (
    <section aria-labelledby="catalog-importer-image-issues-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            id="catalog-importer-image-issues-heading"
            className="font-semibold"
          >
            Seller images need review
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter a complete image URL or leave it blank.
          </p>
        </div>
        {rows.length > 1 ? (
          <Button
            type="button"
            variant="outline"
            disabled={!canSaveAll}
            onClick={() =>
              controller.resolveImageUrlIssues(
                parsedRows.flatMap(({ parsed, row }) =>
                  parsed.valid
                    ? [{ imageUrl: parsed.value, rowId: row.id }]
                    : [],
                ),
              )
            }
          >
            Save all
          </Button>
        ) : null}
      </div>

      <IssueTable
        aria-label="Seller image rows"
        className="min-w-0 sm:min-w-[58rem]"
        containerClassName="mt-4"
      >
        <TableHeader className="hidden sm:table-header-group">
          <TableRow>
            <TableHead scope="col" className="w-px">
              Row
            </TableHead>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col" className="max-w-72">
              Original URL
            </TableHead>
            <TableHead scope="col" className="min-w-80">
              Corrected URL
            </TableHead>
            <TableHead scope="col" className="w-px">
              <span className="sr-only">Save</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parsedRows.map(({ parsed, row }) => (
            <TableRow
              key={row.id}
              className="grid gap-3 py-4 sm:table-row sm:py-0"
            >
              <TableHead
                scope="row"
                className="text-muted-foreground flex h-auto items-center gap-2 p-0 font-mono text-xs font-normal sm:table-cell sm:p-2"
              >
                <span className="font-sans font-medium sm:hidden">Row</span>
                {row.sourceRow}
              </TableHead>
              <TableCell className="p-0 font-medium sm:table-cell sm:p-2">
                <span className="text-muted-foreground mb-1 block text-xs font-medium sm:hidden">
                  Name
                </span>
                {row.sourceTitle}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-72 p-0 break-all sm:table-cell sm:p-2">
                <span className="mb-1 block text-xs font-medium sm:hidden">
                  Original URL
                </span>
                {row.sourceImageUrl}
              </TableCell>
              <TableCell className="p-0 sm:table-cell sm:p-2">
                <span className="text-muted-foreground mb-1 block text-xs font-medium sm:hidden">
                  Corrected URL
                </span>
                <Input
                  aria-label={`Correct image URL for row ${row.sourceRow}`}
                  aria-invalid={!parsed.valid}
                  aria-describedby={
                    !parsed.valid
                      ? `catalog-importer-image-message-${row.sourceRow}`
                      : undefined
                  }
                  type="url"
                  value={values[row.id] ?? row.sourceImageUrl}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setValues((current) => ({
                      ...current,
                      [row.id]: value,
                    }));
                  }}
                />
                {!parsed.valid ? (
                  <p
                    id={`catalog-importer-image-message-${row.sourceRow}`}
                    className="text-destructive mt-1 text-xs"
                  >
                    Use a complete http or https image URL.
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="flex justify-end p-0 sm:table-cell sm:p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!parsed.valid}
                  aria-label={`Save image URL for row ${row.sourceRow}`}
                  title={`Save image URL for row ${row.sourceRow}`}
                  onClick={() => {
                    if (parsed.valid) {
                      controller.resolveImageUrlIssues([
                        { imageUrl: parsed.value, rowId: row.id },
                      ]);
                    }
                  }}
                >
                  <Save className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </IssueTable>
    </section>
  );
}

function ImagePreviewWarningsTable({
  controller,
  rows,
}: {
  controller: CatalogImporterWorkbenchController;
  rows: CatalogImportRow[];
}) {
  return (
    <section aria-labelledby="catalog-importer-image-warnings-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3
            id="catalog-importer-image-warnings-heading"
            className="font-semibold"
          >
            Seller images could not be previewed
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            The image host may block browser previews.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            controller.acknowledgeImagePreviewWarnings(
              rows.map((row) => row.id),
            )
          }
        >
          Keep {rows.length === 1 ? "URL" : "URLs"}
        </Button>
      </div>

      <IssueTable
        aria-label="Seller image preview warnings"
        containerClassName="mt-4"
      >
        <TableHeader className="hidden sm:table-header-group">
          <TableRow>
            <TableHead scope="col" className="w-px">
              Row
            </TableHead>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col">Image URL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="grid gap-3 py-4 sm:table-row sm:py-0"
            >
              <TableHead
                scope="row"
                className="text-muted-foreground flex h-auto items-center gap-2 p-0 font-mono text-xs font-normal sm:table-cell sm:p-2"
              >
                <span className="font-sans font-medium sm:hidden">Row</span>
                {row.sourceRow}
              </TableHead>
              <TableCell className="p-0 font-medium sm:table-cell sm:p-2">
                <span className="text-muted-foreground mb-1 block text-xs font-medium sm:hidden">
                  Name
                </span>
                {row.sourceTitle}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-96 p-0 break-all sm:table-cell sm:p-2">
                <span className="mb-1 block text-xs font-medium sm:hidden">
                  Image URL
                </span>
                {row.sourceImageUrl}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </IssueTable>
    </section>
  );
}

function SavedIdIssuesTable({
  controller,
  rows,
}: {
  controller: CatalogImporterWorkbenchController;
  rows: CatalogImportRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [rematching, setRematching] = useState(false);

  async function rematch(rowIds: string[]) {
    setError(null);
    setRematching(true);
    try {
      await controller.clearCultivarReferenceIdIssues(rowIds);
    } catch {
      setError(
        "Name matching did not finish. The saved IDs are unchanged; try again.",
      );
    } finally {
      setRematching(false);
    }
  }

  return (
    <section aria-labelledby="catalog-importer-saved-id-issues-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            id="catalog-importer-saved-id-issues-heading"
            className="font-semibold"
          >
            Saved cultivar IDs not found
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Match these rows by name. Invalid IDs are not exported as resolved.
          </p>
        </div>
        {rows.length > 1 ? (
          <Button
            type="button"
            variant="outline"
            disabled={rematching}
            onClick={() => void rematch(rows.map((row) => row.id))}
          >
            {rematching ? <Spinner /> : null}
            Match all by name
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      ) : null}

      <IssueTable
        aria-label="Invalid saved cultivar ID rows"
        containerClassName="mt-4"
      >
        <TableHeader className="hidden sm:table-header-group">
          <TableRow>
            <TableHead scope="col" className="w-px">
              Row
            </TableHead>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col">Daylily Catalog ID</TableHead>
            <TableHead scope="col" className="w-px">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="grid gap-3 py-4 sm:table-row sm:py-0"
            >
              <TableHead
                scope="row"
                className="text-muted-foreground flex h-auto items-center gap-2 p-0 font-mono text-xs font-normal sm:table-cell sm:p-2"
              >
                <span className="font-sans font-medium sm:hidden">Row</span>
                {row.sourceRow}
              </TableHead>
              <TableCell className="p-0 font-medium sm:table-cell sm:p-2">
                <span className="text-muted-foreground mb-1 block text-xs font-medium sm:hidden">
                  Name
                </span>
                {row.sourceTitle}
              </TableCell>
              <TableCell className="p-0 font-mono text-xs sm:table-cell sm:p-2">
                <span className="text-muted-foreground mb-1 block font-sans text-xs font-medium sm:hidden">
                  Daylily Catalog ID
                </span>
                {row.cultivarReferenceIdWarning}
              </TableCell>
              <TableCell className="p-0 sm:table-cell sm:p-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={rematching}
                  onClick={() => void rematch([row.id])}
                >
                  Match by name
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </IssueTable>
    </section>
  );
}

export function CatalogImporterIssues({
  controller,
  destination = "workbook",
}: {
  controller: CatalogImporterWorkbenchController;
  destination?: "import" | "workbook";
}) {
  const duplicateGroups = useMemo(
    () => getDuplicateGroups(controller.includedRows),
    [controller.includedRows],
  );
  const priceRows = controller.includedRows.filter(
    (row) => row.priceWarning !== null,
  );
  const imagePreviewWarningRows = SHOW_IMAGE_ISSUES
    ? controller.includedRows.filter((row) =>
        isCatalogImportImagePreviewWarning(row.imageUrlWarning),
      )
    : [];
  const imageUrlRows = SHOW_IMAGE_ISSUES
    ? controller.includedRows.filter(
        (row) =>
          row.imageUrlWarning !== null &&
          !isCatalogImportImagePreviewWarning(row.imageUrlWarning),
      )
    : [];
  const savedIdRows = controller.includedRows.filter(
    (row) => row.cultivarReferenceIdWarning !== null,
  );
  const issueRows = [
    ...new Map(
      [
        ...duplicateGroups.flatMap((group) => group.rows),
        ...priceRows,
        ...imagePreviewWarningRows,
        ...imageUrlRows,
        ...savedIdRows,
      ].map((row) => [row.id, row]),
    ).values(),
  ];

  const requiredIssueCount =
    priceRows.length + imageUrlRows.length + savedIdRows.length;
  const warningCount = duplicateGroups.length + imagePreviewWarningRows.length;

  if (requiredIssueCount === 0 && warningCount === 0) {
    return null;
  }

  return (
    <section
      id="catalog-importer-issues"
      role="region"
      aria-labelledby="catalog-importer-issues-heading"
      className="!scroll-mt-16"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            id="catalog-importer-issues-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Review spreadsheet data
          </h2>
          <p className="text-muted-foreground text-sm tabular-nums">
            {controller.completedIssueCount.toLocaleString()} of{" "}
            {controller.issueProgressTotal.toLocaleString()} completed
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              Exclude {issueRows.length.toLocaleString()} from {destination}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Exclude {issueRows.length.toLocaleString()} listings from{" "}
                {destination}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                These listings will be skipped.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  controller.excludeIssueRows(issueRows.map((row) => row.id))
                }
              >
                Exclude {issueRows.length.toLocaleString()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="mt-5 space-y-6">
        {duplicateGroups.length > 0 ? (
          <section aria-labelledby="duplicate-issues-heading">
            <h3 id="duplicate-issues-heading" className="font-semibold">
              Possible duplicate listings
            </h3>
            <div className="mt-3 space-y-6">
              {duplicateGroups.map((group) => (
                <DuplicateGroupTable
                  key={group.id}
                  controller={controller}
                  destination={destination}
                  rows={group.rows}
                />
              ))}
            </div>
          </section>
        ) : null}

        {priceRows.length > 0 ? (
          <div>
            <PriceIssuesTable
              controller={controller}
              destination={destination}
              rows={priceRows}
            />
          </div>
        ) : null}

        {imageUrlRows.length > 0 ? (
          <div>
            <ImageUrlIssuesTable controller={controller} rows={imageUrlRows} />
          </div>
        ) : null}

        {imagePreviewWarningRows.length > 0 ? (
          <div>
            <ImagePreviewWarningsTable
              controller={controller}
              rows={imagePreviewWarningRows}
            />
          </div>
        ) : null}

        {savedIdRows.length > 0 ? (
          <div>
            <SavedIdIssuesTable controller={controller} rows={savedIdRows} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
