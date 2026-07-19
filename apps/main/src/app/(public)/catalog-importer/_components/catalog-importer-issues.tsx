"use client";

import { useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface DuplicateGroup {
  id: string;
  rows: CatalogImportRow[];
}

type ParsedInput<T> = { valid: true; value: T } | { valid: false; value: null };

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
  const normalized = value.replaceAll(",", "").replace(/^\$/, "").trim();
  if (!normalized) {
    return { valid: true, value: null };
  }
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { valid: false, value: null };
  }

  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0
    ? { valid: true, value: price }
    : { valid: false, value: null };
}

function getBundlePriceSuggestion(value: string) {
  const quantityWords: Record<string, number> = {
    eight: 8,
    five: 5,
    four: 4,
    nine: 9,
    one: 1,
    seven: 7,
    six: 6,
    ten: 10,
    three: 3,
    two: 2,
  };
  const match =
    /^\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:for|\/)\s*\$?\s*(\d+(?:\.\d+)?)\s*$/i.exec(
      value.replaceAll(",", ""),
    );
  if (!match) {
    return null;
  }

  const quantityToken = match[1]!.toLowerCase();
  const quantity = /^\d+$/.test(quantityToken)
    ? Number(quantityToken)
    : (quantityWords[quantityToken] ?? 0);
  const total = Number(match[2]);
  if (
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(total) ||
    total < 0
  ) {
    return null;
  }

  return total / quantity;
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

function DuplicateGroupTable({
  controller,
  rows,
}: {
  controller: CatalogImporterWorkbenchController;
  rows: CatalogImportRow[];
}) {
  const sourceRows = rows.map((row) => ({
    row,
    sourceCells: controller.getSourceCellsForRow(row),
  }));
  const columns = sourceRows[0]?.sourceCells ?? [];
  const title = rows[0]?.title ?? "this cultivar";

  return (
    <div className="space-y-4 py-6 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-semibold">Multiple listings for {title}</h4>
          <p className="text-muted-foreground mt-1 text-sm">
            These rows link to the same cultivar, but both listings may be
            intentional. Removing a row affects only the prepared workbook; your
            uploaded file stays untouched.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() =>
            controller.keepDuplicateRows(rows.map((row) => row.id))
          }
        >
          {rows.length === 2 ? "Keep both listings" : "Keep all listings"}
        </Button>
      </div>

      <Table
        aria-label={`Duplicate rows for ${title}`}
        className="w-max min-w-full"
      >
        <TableHeader>
          <TableRow>
            <TableHead
              scope="col"
              className="bg-muted/60 sticky left-0 z-10 w-px"
            >
              Action
            </TableHead>
            <TableHead scope="col" className="w-px">
              Row
            </TableHead>
            {columns.map((column) => (
              <TableHead
                key={column.column}
                scope="col"
                className="min-w-32 align-bottom whitespace-normal"
              >
                <span className="text-muted-foreground block font-mono text-[0.6875rem] font-normal">
                  {column.column}
                </span>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sourceRows.map(({ row, sourceCells }) => (
            <TableRow key={row.id}>
              <TableCell className="bg-background sticky left-0 z-10 w-px">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Remove row ${row.sourceRow} from prepared workbook`}
                  onClick={() => controller.removeDuplicateRow(row.id)}
                >
                  <Trash2 className="size-4" />
                  Remove row {row.sourceRow}
                </Button>
              </TableCell>
              <TableHead
                scope="row"
                className="text-muted-foreground h-auto font-mono text-xs font-normal"
              >
                {row.sourceRow}
              </TableHead>
              {sourceCells.map((cell) => (
                <TableCell
                  key={cell.column}
                  className="max-w-80 align-top whitespace-normal"
                >
                  {cell.value || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PriceIssuesTable({
  controller,
  rows,
}: {
  controller: CatalogImporterWorkbenchController;
  rows: CatalogImportRow[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.map((row) => {
        const suggestion = getBundlePriceSuggestion(row.sourcePrice);
        return [
          row.id,
          suggestion === null ? row.sourcePrice : suggestion.toFixed(2),
        ];
      }),
    ),
  );
  const parsedRows = rows.map((row) => {
    const suggestion = getBundlePriceSuggestion(row.sourcePrice);
    const parsed = parsePrice(values[row.id] ?? row.sourcePrice);
    return {
      canSave:
        parsed.valid &&
        (suggestion === null || controller.mapping.privateNote !== null),
      parsed,
      row,
      suggestion,
    };
  });
  const canSaveAll = parsedRows.every(({ canSave }) => canSave);

  return (
    <section aria-labelledby="catalog-importer-price-issues-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            id="catalog-importer-price-issues-heading"
            className="font-semibold"
          >
            Price formats need review
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            The catalog price field needs one numeric unit price. You can leave
            a row unresolved; a current-workbook download keeps its original
            value.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!canSaveAll}
          onClick={() =>
            controller.resolvePriceIssues(
              parsedRows.flatMap(({ canSave, parsed, row, suggestion }) =>
                canSave
                  ? [
                      {
                        preserveOriginalOffer: suggestion !== null,
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

      <Table
        aria-label="Price format rows"
        className="mt-4 min-w-0 sm:min-w-[48rem]"
      >
        <TableHeader className="hidden sm:table-header-group">
          <TableRow>
            <TableHead scope="col" className="w-px">
              Row
            </TableHead>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col">Original price</TableHead>
            <TableHead scope="col" className="min-w-56">
              Corrected price
            </TableHead>
            <TableHead scope="col" className="w-px">
              <span className="sr-only">Save</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parsedRows.map(({ canSave, parsed, row, suggestion }) => (
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
              <TableCell className="text-muted-foreground p-0 sm:table-cell sm:p-2">
                <span className="mb-1 block text-xs font-medium sm:hidden">
                  Original price
                </span>
                <span>{row.sourcePrice}</span>
                {suggestion !== null ? (
                  <span className="mt-1 block text-xs">
                    Suggested unit price: {suggestion.toFixed(2)}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="p-0 sm:table-cell sm:p-2">
                <span className="text-muted-foreground mb-1 block text-xs font-medium sm:hidden">
                  Corrected price
                </span>
                <Input
                  aria-label={`Correct price for row ${row.sourceRow}`}
                  aria-invalid={!parsed.valid}
                  aria-describedby={
                    !parsed.valid || suggestion !== null
                      ? `catalog-importer-price-message-${row.sourceRow}`
                      : undefined
                  }
                  inputMode="decimal"
                  value={values[row.id] ?? row.sourcePrice}
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
                    id={`catalog-importer-price-message-${row.sourceRow}`}
                    className="text-destructive mt-1 text-xs"
                  >
                    Use one price, such as 12 or 12.50.
                  </p>
                ) : suggestion !== null &&
                  controller.mapping.privateNote !== null ? (
                  <p
                    id={`catalog-importer-price-message-${row.sourceRow}`}
                    className="text-muted-foreground mt-1 text-xs"
                  >
                    Saving also adds “Original price: {row.sourcePrice}” to the
                    private note.
                  </p>
                ) : suggestion !== null ? (
                  <p
                    id={`catalog-importer-price-message-${row.sourceRow}`}
                    className="text-muted-foreground mt-1 text-xs"
                  >
                    Map a private note column to preserve the original bundle
                    offer, or leave this row unresolved.
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="flex justify-end p-0 sm:table-cell sm:p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canSave}
                  aria-label={`Save price for row ${row.sourceRow}`}
                  title={`Save price for row ${row.sourceRow}`}
                  onClick={() => {
                    if (canSave && parsed.valid) {
                      controller.resolvePriceIssues([
                        {
                          preserveOriginalOffer: suggestion !== null,
                          price: parsed.value,
                          rowId: row.id,
                        },
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
      </Table>
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
            Enter a complete image URL or leave it blank. You can leave a row
            unresolved; the current workbook keeps its original value.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!canSaveAll}
          onClick={() =>
            controller.resolveImageUrlIssues(
              parsedRows.flatMap(({ parsed, row }) =>
                parsed.valid ? [{ imageUrl: parsed.value, rowId: row.id }] : [],
              ),
            )
          }
        >
          Save all
        </Button>
      </div>

      <Table
        aria-label="Seller image rows"
        className="mt-4 min-w-0 sm:min-w-[58rem]"
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
            <TableHead scope="col" className="min-w-64">
              What happened
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
              <TableCell className="text-muted-foreground p-0 text-sm sm:table-cell sm:p-2">
                <span className="mb-1 block text-xs font-medium sm:hidden">
                  What happened
                </span>
                {isCatalogImportImagePreviewWarning(row.imageUrlWarning)
                  ? "We could not preview this seller image from your browser. The remote server, hotlink policy, timeout, or file format may be responsible."
                  : "This is not a complete HTTP or HTTPS image URL."}
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
      </Table>
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
            These IDs no longer identify a cultivar. A single confident name
            match replaces the ID automatically; uncertain names move to manual
            review. Invalid IDs are never exported as resolved identity.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={rematching}
          onClick={() => void rematch(rows.map((row) => row.id))}
        >
          {rematching ? <Spinner /> : null}
          Match all by name
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      ) : null}

      <Table aria-label="Invalid saved cultivar ID rows" className="mt-4">
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
      </Table>
    </section>
  );
}

export function CatalogImporterIssues({
  controller,
}: {
  controller: CatalogImporterWorkbenchController;
}) {
  const duplicateGroups = useMemo(
    () => getDuplicateGroups(controller.includedRows),
    [controller.includedRows],
  );
  const priceRows = controller.includedRows.filter(
    (row) => row.priceWarning !== null,
  );
  const imageUrlRows = controller.includedRows.filter(
    (row) => row.imageUrlWarning !== null,
  );
  const savedIdRows = controller.includedRows.filter(
    (row) => row.cultivarReferenceIdWarning !== null,
  );

  if (controller.issueCount === 0) {
    return null;
  }

  return (
    <section
      id="catalog-importer-issues"
      role="region"
      aria-labelledby="catalog-importer-issues-heading"
      className="!scroll-mt-16 border-t pt-10"
    >
      <div>
        <h2
          id="catalog-importer-issues-heading"
          className="text-xl font-semibold tracking-tight"
        >
          Fix spreadsheet issues
        </h2>
        <p className="text-muted-foreground mt-1 text-sm tabular-nums">
          {controller.issueCount.toLocaleString()} issue
          {controller.issueCount === 1 ? "" : "s"} remaining
        </p>
      </div>

      <div className="mt-6 divide-y border-y">
        {duplicateGroups.length > 0 ? (
          <section className="py-6" aria-labelledby="duplicate-issues-heading">
            <h3 id="duplicate-issues-heading" className="font-semibold">
              Duplicate listings
            </h3>
            <div className="divide-y">
              {duplicateGroups.map((group) => (
                <DuplicateGroupTable
                  key={group.id}
                  controller={controller}
                  rows={group.rows}
                />
              ))}
            </div>
          </section>
        ) : null}

        {priceRows.length > 0 ? (
          <div className="py-6">
            <PriceIssuesTable controller={controller} rows={priceRows} />
          </div>
        ) : null}

        {imageUrlRows.length > 0 ? (
          <div className="py-6">
            <ImageUrlIssuesTable controller={controller} rows={imageUrlRows} />
          </div>
        ) : null}

        {savedIdRows.length > 0 ? (
          <div className="py-6">
            <SavedIdIssuesTable controller={controller} rows={savedIdRows} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
