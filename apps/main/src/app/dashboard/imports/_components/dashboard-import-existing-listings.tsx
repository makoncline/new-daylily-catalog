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
import type { CatalogImportRow } from "@/lib/catalog-importer";
import type {
  CatalogImportComparableListing,
  CatalogImportExistingListingMatch,
} from "@/lib/catalog-import-existing-listings";
import { getCatalogImportExistingListingDifferences } from "@/lib/catalog-import-existing-listings";
import { prepareCatalogImportListing } from "@/lib/catalog-importer";
import { formatPrice } from "@/lib/utils";

export interface DashboardImportExistingMatchRow {
  comparable: CatalogImportComparableListing;
  match: Exclude<CatalogImportExistingListingMatch, { kind: "none" }>;
  row: CatalogImportRow;
}

export function DashboardImportAlreadyExistingRows({
  importedRows = [],
  rows,
}: {
  importedRows?: CatalogImportRow[];
  rows: DashboardImportExistingMatchRow[];
}) {
  const catalogRows = [
    ...rows.map(({ comparable, match, row }) => {
      const existing = match.listings[0]!;
      return {
        ...existing,
        key: row.id,
        sourceRow: row.sourceRow,
        status: "Already existed",
        differences: getCatalogImportExistingListingDifferences(
          comparable,
          existing,
        ),
        listingId: existing.id,
      };
    }),
    ...importedRows.map((row) => ({
      ...prepareCatalogImportListing(row),
      key: `imported-${row.id}`,
      sourceRow: row.sourceRow,
      status: "Imported",
      differences: [] as string[],
      listingId: null,
    })),
  ];
  const total = catalogRows.length;
  if (total === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-medium">
        {total.toLocaleString()} {total === 1 ? "listing is" : "listings are"}{" "}
        in your catalog
      </h3>
      <div className="max-h-96 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10 hidden lg:table-header-group">
            <TableRow>
              <TableHead className="w-20">Row</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-24">Price</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Private note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalogRows.map((row) => (
              <TableRow
                key={row.key}
                className="grid gap-2 p-3 lg:table-row lg:p-0"
              >
                <TableCell className="p-0 align-top lg:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium lg:hidden">
                    Row
                  </p>
                  <span className="text-muted-foreground font-mono text-xs">
                    {row.sourceRow}
                  </span>
                </TableCell>
                <TableCell className="p-0 align-top lg:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium lg:hidden">
                    Name
                  </p>
                  {row.listingId ? (
                    <Button
                      asChild
                      size="sm"
                      variant="link"
                      className="max-w-full justify-start"
                    >
                      <Link
                        href={`/dashboard/listings?editing=${encodeURIComponent(row.listingId)}`}
                        target="_blank"
                        rel="noopener"
                      >
                        <span className="truncate">{row.title}</span>
                        <ExternalLink
                          data-icon="inline-end"
                          aria-hidden="true"
                        />
                      </Link>
                    </Button>
                  ) : (
                    <span className="font-medium">{row.title}</span>
                  )}
                </TableCell>
                <TableCell className="p-0 align-top lg:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium lg:hidden">
                    Status
                  </p>
                  <span className="text-sm">{row.status}</span>
                  {row.differences.length > 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Different {row.differences.join(", ")}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="p-0 align-top lg:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium lg:hidden">
                    Price
                  </p>
                  <span className="text-sm tabular-nums">
                    {row.price === null ? "—" : formatPrice(row.price)}
                  </span>
                </TableCell>
                <TableCell className="p-0 align-top lg:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium lg:hidden">
                    Description
                  </p>
                  <span
                    className="line-clamp-1 text-sm"
                    title={row.description ?? undefined}
                  >
                    {row.description?.trim() ? row.description : "—"}
                  </span>
                </TableCell>
                <TableCell className="p-0 align-top lg:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium lg:hidden">
                    Private note
                  </p>
                  <span
                    className="text-muted-foreground line-clamp-1 text-sm"
                    title={row.privateNote ?? undefined}
                  >
                    {row.privateNote?.trim() ? row.privateNote : "—"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
