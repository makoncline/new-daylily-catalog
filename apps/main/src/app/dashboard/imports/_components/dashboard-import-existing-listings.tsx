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
  const total = rows.length + importedRows.length;
  if (total === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">
        {total.toLocaleString()} {total === 1 ? "listing is" : "listings are"}{" "}
        in your catalog
      </h3>
      <div className="max-h-96 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10 hidden md:table-header-group">
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
            {rows.map(({ match, row }) => {
              const existing = match.listings[0]!;
              return (
                <TableRow
                  key={row.id}
                  className="grid gap-2 p-3 md:table-row md:p-0"
                >
                  <TableCell className="p-0 align-top md:p-2">
                    <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                      Row
                    </p>
                    <span className="text-muted-foreground font-mono text-xs">
                      {row.sourceRow}
                    </span>
                  </TableCell>
                  <TableCell className="p-0 align-top md:p-2">
                    <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                      Name
                    </p>
                    <Button
                      asChild
                      size="sm"
                      variant="link"
                      className="text-foreground h-auto justify-start p-0 font-medium"
                    >
                      <Link
                        href={`/dashboard/listings?editing=${encodeURIComponent(existing.id)}`}
                        target="_blank"
                      >
                        {existing.title}
                        <ExternalLink aria-hidden="true" />
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell className="p-0 align-top md:p-2">
                    <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                      Status
                    </p>
                    <span className="text-muted-foreground text-sm">
                      Already existed
                    </span>
                  </TableCell>
                  <TableCell className="p-0 align-top md:p-2">
                    <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                      Price
                    </p>
                    <span className="text-sm tabular-nums">
                      {existing.price === null
                        ? "—"
                        : formatPrice(existing.price)}
                    </span>
                  </TableCell>
                  <TableCell className="p-0 align-top md:p-2">
                    <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                      Description
                    </p>
                    <span
                      className="line-clamp-1 text-sm"
                      title={existing.description ?? undefined}
                    >
                      {existing.description?.trim()
                        ? existing.description
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="p-0 align-top md:p-2">
                    <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                      Private note
                    </p>
                    <span
                      className="text-muted-foreground line-clamp-1 text-sm"
                      title={existing.privateNote ?? undefined}
                    >
                      {existing.privateNote?.trim()
                        ? existing.privateNote
                        : "—"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {importedRows.map((row) => (
              <TableRow
                key={`imported-${row.id}`}
                className="grid gap-2 p-3 md:table-row md:p-0"
              >
                <TableCell className="p-0 align-top md:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                    Row
                  </p>
                  <span className="text-muted-foreground font-mono text-xs">
                    {row.sourceRow}
                  </span>
                </TableCell>
                <TableCell className="p-0 align-top font-medium md:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                    Name
                  </p>
                  {row.title}
                </TableCell>
                <TableCell className="p-0 align-top md:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                    Status
                  </p>
                  <span className="text-sm">Imported</span>
                </TableCell>
                <TableCell className="p-0 align-top md:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                    Price
                  </p>
                  <span className="text-sm tabular-nums">
                    {row.price === null ? "—" : formatPrice(row.price)}
                  </span>
                </TableCell>
                <TableCell className="p-0 align-top md:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                    Description
                  </p>
                  <span
                    className="line-clamp-1 text-sm"
                    title={row.description || undefined}
                  >
                    {row.description || "—"}
                  </span>
                </TableCell>
                <TableCell className="p-0 align-top md:p-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium md:hidden">
                    Private note
                  </p>
                  <span
                    className="text-muted-foreground line-clamp-1 text-sm"
                    title={row.privateNote || undefined}
                  >
                    {row.privateNote || "—"}
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
