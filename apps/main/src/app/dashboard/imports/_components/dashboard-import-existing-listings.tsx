"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  getCatalogImportExistingListingDifferences,
  type CatalogImportComparableListing,
  type CatalogImportExistingListingMatch,
} from "@/lib/catalog-import-existing-listings";
import { formatPrice } from "@/lib/utils";

export interface DashboardImportExistingMatchRow {
  comparable: CatalogImportComparableListing;
  match: Exclude<CatalogImportExistingListingMatch, { kind: "none" }>;
  row: CatalogImportRow;
}

function ListingValues({
  description,
  price,
  privateNote,
  title,
}: CatalogImportComparableListing) {
  return (
    <div className="min-w-48 space-y-1">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground text-xs tabular-nums">
        {price === null ? "No price" : formatPrice(price)}
      </p>
      {description ? (
        <p className="line-clamp-2 text-sm" title={description}>
          {description}
        </p>
      ) : null}
      {privateNote ? (
        <p
          className="text-muted-foreground line-clamp-2 text-xs"
          title={privateNote}
        >
          {privateNote}
        </p>
      ) : null}
    </div>
  );
}

function ExistingListingLink({ id, title }: { id: string; title: string }) {
  return (
    <Button asChild size="sm" variant="link" className="h-auto p-0">
      <Link
        href={`/dashboard/listings?editing=${encodeURIComponent(id)}`}
        target="_blank"
      >
        Edit {title}
        <ExternalLink aria-hidden="true" />
      </Link>
    </Button>
  );
}

export function DashboardImportExistingListingReview({
  completedCount,
  controller,
  rows,
  totalCount,
}: {
  completedCount: number;
  controller: CatalogImporterWorkbenchController;
  rows: DashboardImportExistingMatchRow[];
  totalCount: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="border-y py-5">
        <p className="font-medium">Existing listings reviewed</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {totalCount.toLocaleString()} decisions complete
        </p>
      </div>
    );
  }

  const { comparable, match, row } = rows[0]!;
  const existing = match.listings[0]!;
  const differences = getCatalogImportExistingListingDifferences(
    comparable,
    existing,
  );

  return (
    <section className="space-y-4" aria-labelledby="existing-listings-heading">
      <div>
        <h2 id="existing-listings-heading" className="text-xl font-semibold">
          Decide how to handle existing listings
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {completedCount.toLocaleString()} of {totalCount.toLocaleString()}{" "}
          reviewed. This incoming row matches a listing already in your catalog,
          but the listing data differs.
        </p>
      </div>

      <div className="max-h-[42rem] overflow-auto rounded-md border">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10 hidden md:table-header-group">
            <TableRow>
              <TableHead>Incoming row</TableHead>
              <TableHead>Existing listing</TableHead>
              <TableHead>Different fields</TableHead>
              <TableHead className="w-64">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              key={row.id}
              className="grid gap-4 p-4 md:table-row md:p-0"
            >
              <TableCell className="p-0 align-top md:p-2">
                <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                  Incoming row
                </p>
                <ListingValues {...comparable} />
                <p className="text-muted-foreground mt-2 font-mono text-xs">
                  Spreadsheet row {row.sourceRow}
                </p>
              </TableCell>
              <TableCell className="p-0 align-top md:p-2">
                <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                  Existing listing
                </p>
                <ListingValues {...existing} />
                <div className="mt-2">
                  <ExistingListingLink
                    id={existing.id}
                    title={existing.title}
                  />
                </div>
                {match.listings.length > 1 ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {match.listings.length - 1} more existing match
                    {match.listings.length === 2 ? "" : "es"}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground p-0 align-top text-sm md:p-2">
                <span className="mr-1 font-medium md:hidden">
                  Different fields:
                </span>
                {differences.join(", ")}
              </TableCell>
              <TableCell className="p-0 align-top md:p-2">
                <div className="flex flex-col items-start gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full md:w-auto"
                    onClick={() =>
                      controller.setExistingListingDecision(
                        row.id,
                        "use-existing",
                      )
                    }
                  >
                    Keep existing listing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full md:w-auto"
                    onClick={() =>
                      controller.setExistingListingDecision(row.id, "create")
                    }
                  >
                    Create new listing from spreadsheet
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function DashboardImportAlreadyExistingRows({
  controller,
  rows,
}: {
  controller: CatalogImporterWorkbenchController;
  rows: DashboardImportExistingMatchRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <section className="space-y-3 border-y py-3">
      <h3 className="text-sm font-medium">
        {rows.length.toLocaleString()} listing{rows.length === 1 ? "" : "s"}{" "}
        already {rows.length === 1 ? "exists" : "exist"} and will be skipped
      </h3>
      <div className="max-h-96 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10 hidden md:table-header-group">
            <TableRow>
              <TableHead>Spreadsheet row</TableHead>
              <TableHead>Existing listing</TableHead>
              <TableHead className="w-40">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ comparable, match, row }) => {
              const existing = match.listings[0]!;
              return (
                <TableRow
                  key={row.id}
                  className="grid gap-4 p-4 md:table-row md:p-0"
                >
                  <TableCell className="p-0 align-top md:p-2">
                    <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                      Spreadsheet row
                    </p>
                    <p className="font-medium">{comparable.title}</p>
                    <p className="text-muted-foreground mt-1 font-mono text-xs">
                      Spreadsheet row {row.sourceRow}
                    </p>
                  </TableCell>
                  <TableCell className="p-0 align-top md:p-2">
                    <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                      Existing listing
                    </p>
                    <ListingValues {...existing} />
                    <div className="mt-2">
                      <ExistingListingLink
                        id={existing.id}
                        title={existing.title}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="p-0 align-top md:p-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full md:w-auto"
                      onClick={() =>
                        controller.setExistingListingDecision(row.id, "create")
                      }
                    >
                      Create anyway
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
