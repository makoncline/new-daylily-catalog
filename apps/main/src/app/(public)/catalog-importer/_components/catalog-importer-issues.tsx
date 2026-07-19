"use client";

import { useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImportRow } from "@/lib/catalog-importer";

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
            Remove an accidental copy, or keep every listing if they are
            intentional.
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
          Keep all
        </Button>
      </div>

      <Table
        aria-label={`Duplicate rows for ${title}`}
        className="w-max min-w-full"
      >
        <TableHeader>
          <TableRow>
            <TableHead className="bg-muted/60 sticky left-0 z-10 w-px">
              Action
            </TableHead>
            <TableHead className="w-px">Row</TableHead>
            {columns.map((column) => (
              <TableHead
                key={column.column}
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
                  aria-label={`Remove row ${row.sourceRow}`}
                  onClick={() => controller.removeDuplicateRow(row.id)}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {row.sourceRow}
              </TableCell>
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
    Object.fromEntries(rows.map((row) => [row.id, row.sourcePrice])),
  );
  const parsedRows = rows.map((row) => ({
    parsed: parsePrice(values[row.id] ?? row.sourcePrice),
    row,
  }));
  const canSaveAll = parsedRows.every(({ parsed }) => parsed.valid);

  return (
    <section aria-labelledby="catalog-importer-price-issues-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            id="catalog-importer-price-issues-heading"
            className="font-semibold"
          >
            Invalid prices
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter one price for each listing, or leave the corrected price
            blank.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!canSaveAll}
          onClick={() =>
            controller.resolvePriceIssues(
              parsedRows.flatMap(({ parsed, row }) =>
                parsed.valid ? [{ price: parsed.value, rowId: row.id }] : [],
              ),
            )
          }
        >
          Save all
        </Button>
      </div>

      <Table aria-label="Invalid price rows" className="mt-4 min-w-[44rem]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-px">Row</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Original price</TableHead>
            <TableHead className="min-w-56">Corrected price</TableHead>
            <TableHead className="w-px">
              <span className="sr-only">Save</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parsedRows.map(({ parsed, row }) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {row.sourceRow}
              </TableCell>
              <TableCell className="font-medium">{row.sourceTitle}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.sourcePrice}
              </TableCell>
              <TableCell>
                <Input
                  aria-label={`Correct price for row ${row.sourceRow}`}
                  aria-invalid={!parsed.valid}
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
                  <p className="text-destructive mt-1 text-xs">
                    Use one price, such as 12 or 12.50.
                  </p>
                ) : null}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!parsed.valid}
                  aria-label={`Save price for row ${row.sourceRow}`}
                  title={`Save price for row ${row.sourceRow}`}
                  onClick={() => {
                    if (parsed.valid) {
                      controller.resolvePriceIssues([
                        { price: parsed.value, rowId: row.id },
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
            Invalid image URLs
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter a complete image URL or leave it blank. The preview also
            checks that saved images load.
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

      <Table aria-label="Invalid image URL rows" className="mt-4 min-w-[52rem]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-px">Row</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="max-w-72">Original URL</TableHead>
            <TableHead className="min-w-80">Corrected URL</TableHead>
            <TableHead className="w-px">
              <span className="sr-only">Save</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parsedRows.map(({ parsed, row }) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {row.sourceRow}
              </TableCell>
              <TableCell className="font-medium">{row.sourceTitle}</TableCell>
              <TableCell className="text-muted-foreground max-w-72 break-all">
                {row.sourceImageUrl}
              </TableCell>
              <TableCell>
                <Input
                  aria-label={`Correct image URL for row ${row.sourceRow}`}
                  aria-invalid={!parsed.valid}
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
                  <p className="text-destructive mt-1 text-xs">
                    Use a complete http or https image URL.
                  </p>
                ) : null}
              </TableCell>
              <TableCell>
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
  return (
    <section aria-labelledby="catalog-importer-saved-id-issues-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            id="catalog-importer-saved-id-issues-heading"
            className="font-semibold"
          >
            Saved cultivar links not found
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Clear the unavailable IDs and find each cultivar by name.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            controller.clearCultivarReferenceIdIssues(rows.map((row) => row.id))
          }
        >
          Rematch all
        </Button>
      </div>

      <Table aria-label="Invalid saved cultivar ID rows" className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead className="w-px">Row</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Daylily Catalog ID</TableHead>
            <TableHead className="w-px">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {row.sourceRow}
              </TableCell>
              <TableCell className="font-medium">{row.sourceTitle}</TableCell>
              <TableCell className="font-mono text-xs">
                {row.cultivarReferenceIdWarning}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    controller.clearCultivarReferenceIdIssues([row.id])
                  }
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
