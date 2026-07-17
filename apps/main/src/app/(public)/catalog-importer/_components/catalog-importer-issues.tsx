"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CatalogImporterSourceRow,
  type CatalogImporterSourceCell,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-match-options";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImportRow } from "@/lib/catalog-importer";

type CatalogImporterIssueType = "duplicate" | "image-url" | "price";

interface CatalogImporterRowIssue {
  id: string;
  row: CatalogImportRow;
  type: Exclude<CatalogImporterIssueType, "duplicate">;
}

interface CatalogImporterDuplicateIssue {
  id: string;
  rows: CatalogImportRow[];
  type: "duplicate";
}

type CatalogImporterIssue =
  | CatalogImporterDuplicateIssue
  | CatalogImporterRowIssue;

function getIssues(rows: CatalogImportRow[]) {
  const rowsBySourceRow = new Map(rows.map((row) => [row.sourceRow, row]));
  const duplicateGroups = new Map<number, CatalogImportRow[]>();

  for (const row of rows) {
    if (row.duplicateOfSourceRow === null) {
      continue;
    }

    const firstRow = rowsBySourceRow.get(row.duplicateOfSourceRow);
    if (!firstRow) {
      continue;
    }

    const group = duplicateGroups.get(firstRow.sourceRow) ?? [firstRow];
    group.push(row);
    duplicateGroups.set(firstRow.sourceRow, group);
  }

  return rows.flatMap((row): CatalogImporterIssue[] => {
    const issues: CatalogImporterIssue[] = [];
    const duplicateRows = duplicateGroups.get(row.sourceRow);

    if (duplicateRows) {
      issues.push({
        id: `${row.id}:duplicate-group`,
        rows: duplicateRows,
        type: "duplicate",
      });
    }
    if (row.priceWarning) {
      issues.push({ id: `${row.id}:price`, row, type: "price" });
    }
    if (row.imageUrlWarning) {
      issues.push({ id: `${row.id}:image-url`, row, type: "image-url" });
    }

    return issues;
  });
}

function parsePrice(value: string) {
  const normalized = value.replaceAll(",", "").replace(/^\$/, "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function parseImageUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function DuplicateIssue({
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">Multiple listings for {title}</h3>
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

function PriceIssue({
  controller,
  row,
  sourceCells,
}: {
  controller: CatalogImporterWorkbenchController;
  row: CatalogImportRow;
  sourceCells: CatalogImporterSourceCell[];
}) {
  const [value, setValue] = useState(row.sourcePrice);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <CatalogImporterSourceRow row={row} sourceCells={sourceCells} />

      <form
        className="max-w-xl space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const price = parsePrice(value);
          if (price === null) {
            setError("Enter one price, such as 12 or 12.50.");
            return;
          }
          controller.resolvePriceIssue(row.id, price);
        }}
      >
        <div>
          <h3 className="font-semibold">Correct the price</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            The original value could not be converted to one price.
          </p>
        </div>
        <label htmlFor={`issue-price-${row.id}`} className="sr-only">
          Correct the price
        </label>
        <Input
          id={`issue-price-${row.id}`}
          inputMode="decimal"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `issue-price-error-${row.id}` : undefined}
          onChange={(event) => {
            setValue(event.currentTarget.value);
            setError(null);
          }}
        />
        {error ? (
          <p
            id={`issue-price-error-${row.id}`}
            className="text-destructive text-sm"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save price</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => controller.resolvePriceIssue(row.id, null)}
          >
            Leave price blank
          </Button>
        </div>
      </form>
    </div>
  );
}

function ImageUrlIssue({
  controller,
  row,
  sourceCells,
}: {
  controller: CatalogImporterWorkbenchController;
  row: CatalogImportRow;
  sourceCells: CatalogImporterSourceCell[];
}) {
  const [value, setValue] = useState(row.sourceImageUrl);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <CatalogImporterSourceRow row={row} sourceCells={sourceCells} />

      <form
        className="max-w-xl space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const imageUrl = parseImageUrl(value);
          if (!imageUrl) {
            setError("Enter a complete http or https image URL.");
            return;
          }
          controller.resolveImageUrlIssue(row.id, imageUrl);
        }}
      >
        <div>
          <h3 className="font-semibold">Correct the image URL</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            The original value was not a usable web address.
          </p>
        </div>
        <label htmlFor={`issue-image-url-${row.id}`} className="sr-only">
          Correct the image URL
        </label>
        <Input
          id={`issue-image-url-${row.id}`}
          type="url"
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `issue-image-url-error-${row.id}` : undefined
          }
          onChange={(event) => {
            setValue(event.currentTarget.value);
            setError(null);
          }}
        />
        {error ? (
          <p
            id={`issue-image-url-error-${row.id}`}
            className="text-destructive text-sm"
          >
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save image URL</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => controller.resolveImageUrlIssue(row.id, "")}
          >
            Leave image blank
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CatalogImporterIssues({
  controller,
}: {
  controller: CatalogImporterWorkbenchController;
}) {
  const issues = useMemo(
    () => getIssues(controller.resultRows),
    [controller.resultRows],
  );
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const activeIssue =
    issues.find((issue) => issue.id === activeIssueId) ?? issues[0] ?? null;
  const activeIndex = activeIssue
    ? issues.findIndex((issue) => issue.id === activeIssue.id)
    : -1;

  const moveIssue = (direction: -1 | 1) => {
    if (issues.length < 2) {
      return;
    }
    const nextIndex =
      (Math.max(activeIndex, 0) + direction + issues.length) % issues.length;
    setActiveIssueId(issues[nextIndex]?.id ?? null);
  };

  const activeRow =
    activeIssue && activeIssue.type !== "duplicate" ? activeIssue.row : null;
  const activeSourceCells = activeRow
    ? controller.getSourceCellsForRow(activeRow)
    : [];

  return (
    <Card
      role="region"
      aria-labelledby="catalog-importer-issues-heading"
      className="min-w-0 overflow-hidden shadow-sm"
    >
      <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <CardTitle
            id="catalog-importer-issues-heading"
            role="heading"
            aria-level={2}
          >
            Issues
          </CardTitle>
          <CardDescription className="tabular-nums" aria-live="polite">
            {issues.length === 0
              ? "No spreadsheet issues remaining."
              : `${issues.length.toLocaleString()} issue${issues.length === 1 ? "" : "s"} remaining · ${(activeIndex + 1).toLocaleString()} of ${issues.length.toLocaleString()}`}
          </CardDescription>
        </div>

        {issues.length > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous issue"
              disabled={issues.length < 2}
              onClick={() => moveIssue(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next issue"
              disabled={issues.length < 2}
              onClick={() => moveIssue(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </CardHeader>

      {activeIssue ? (
        <CardContent className="p-4 lg:p-6">
          {activeIssue.type === "duplicate" ? (
            <DuplicateIssue controller={controller} rows={activeIssue.rows} />
          ) : activeIssue.type === "price" ? (
            <PriceIssue
              key={activeIssue.id}
              controller={controller}
              row={activeIssue.row}
              sourceCells={activeSourceCells}
            />
          ) : activeIssue.type === "image-url" ? (
            <ImageUrlIssue
              key={activeIssue.id}
              controller={controller}
              row={activeIssue.row}
              sourceCells={activeSourceCells}
            />
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
