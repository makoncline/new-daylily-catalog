"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Download, SearchX } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableFilteredCount } from "@/components/data-table/data-table-filtered-count";
import { DataTableFilterReset } from "@/components/data-table/data-table-filter-reset";
import { DataTableGlobalFilter } from "@/components/data-table/data-table-global-filter";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { getCatalogImporterResultColumns } from "@/app/(public)/catalog-importer/_components/catalog-importer-result-columns";
import { CatalogImporterReviewSheet } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-sheet";
import { CATALOG_IMPORTER_STATUS_OPTIONS } from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

interface CatalogImporterResultsProps {
  controller: CatalogImporterWorkbenchController;
}

export function CatalogImporterResults({
  controller,
}: CatalogImporterResultsProps) {
  const previousReviewRowIdRef = useRef<string | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const defaultPageSizeAppliedRef = useRef(false);
  const columns = useMemo(
    () =>
      getCatalogImporterResultColumns({
        mapping: controller.mapping,
        mode: controller.mode,
        onOpenReview: controller.openReviewRow,
      }),
    [controller.mapping, controller.mode, controller.openReviewRow],
  );
  const table = useDataTable({
    data: controller.resultRows,
    columns,
    storageKey: "catalog-importer-results",
    columnNames: {
      actions: "Actions",
      description: "Description",
      image: "Image",
      issues: "Issues",
      matchStatus: "Match status",
      price: "Price",
      privateNote: "Private note",
      registryDetails: "Registry details",
      sourceRow: "Source row",
      title: "Name",
    },
    pinnedColumns: {
      left: ["title"],
      right: controller.mode === "pro" ? ["actions"] : [],
    },
    initialStateOverrides: {
      pagination: { pageIndex: 0, pageSize: 20 },
      columnVisibility: {
        sourceRow: false,
      },
    },
  });
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;

  useEffect(() => {
    if (defaultPageSizeAppliedRef.current) {
      return;
    }

    defaultPageSizeAppliedRef.current = true;
    const hasExplicitPageSize = new URLSearchParams(window.location.search).has(
      "size",
    );
    if (!hasExplicitPageSize && table.getState().pagination.pageSize !== 20) {
      table.setPageSize(20);
    }
  }, [table]);

  useEffect(() => {
    const pageCount = Math.max(
      1,
      Math.ceil(filteredRowCount / Math.max(pageSize, 1)),
    );
    if (pageIndex >= pageCount) {
      table.setPageIndex(pageCount - 1);
    }
  }, [
    controller.resultRows.length,
    filteredRowCount,
    pageIndex,
    pageSize,
    table,
  ]);

  useEffect(() => {
    const activeRowId = controller.activeReviewRow?.id ?? null;
    const previousRowId = previousReviewRowIdRef.current;

    if (previousRowId && !activeRowId) {
      window.setTimeout(() => {
        const trigger = document.querySelector<HTMLButtonElement>(
          `[data-review-row-id="${previousRowId}"]`,
        );
        if (trigger) {
          trigger.focus();
        } else {
          resultsHeadingRef.current?.focus();
        }
      }, 0);
    }

    previousReviewRowIdRef.current = activeRowId;
  }, [controller.activeReviewRow?.id]);

  const handleReviewSheetOpenChange = (open: boolean) => {
    if (!open) {
      controller.closeReview();
    }
  };

  return (
    <section
      aria-labelledby="catalog-importer-results-heading"
      className="min-w-0"
    >
      <Card className="min-w-0 overflow-hidden shadow-sm">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
          <div className="space-y-1.5">
            <CardTitle
              ref={resultsHeadingRef}
              id="catalog-importer-results-heading"
              role="heading"
              aria-level={2}
              tabIndex={-1}
            >
              {controller.mode === "public" ? "Matched sample" : "Cleaned list"}
            </CardTitle>
            <CardDescription>
              {controller.mode === "public"
                ? "A free sample of confident matches from your workbook."
                : "Review uncertain names, adjust the table, then export every retained row."}
            </CardDescription>
          </div>
          <p className="text-muted-foreground text-sm tabular-nums">
            {filteredRowCount.toLocaleString()} of{" "}
            {controller.resultRows.length.toLocaleString()} rows
          </p>
        </CardHeader>

        <CardContent className="min-w-0 p-4 pt-0 lg:p-6 lg:pt-0">
          <DataTableLayout
            table={table}
            toolbar={
              <div className="bg-muted/20 flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center">
                  <DataTableGlobalFilter
                    table={table}
                    placeholder="Filter cleaned rows…"
                  />
                  <DataTableFacetedFilter
                    table={table}
                    column={table.getColumn("matchStatus")}
                    title="Match status"
                    options={CATALOG_IMPORTER_STATUS_OPTIONS}
                  />
                  <DataTableFilteredCount table={table} />
                  <DataTableFilterReset table={table} />
                </div>
                <DataTableViewOptions table={table} />
              </div>
            }
            pagination={
              <DataTablePagination
                table={table}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            }
            noResults={
              <div className="rounded-lg border border-dashed p-10 text-center">
                <SearchX className="text-muted-foreground mx-auto size-6" />
                <p className="mt-3 font-medium">No cleaned rows found</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Reset the filters to see the available results.
                </p>
              </div>
            }
          >
            <DataTable table={table} />
          </DataTableLayout>
        </CardContent>

        <CardFooter className="bg-muted/20 flex flex-col items-stretch gap-3 border-t p-4 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <p className="text-muted-foreground text-xs leading-relaxed">
            {controller.mode === "public"
              ? `${controller.matchedRows?.length.toLocaleString() ?? 0} confident matches from ${controller.draftRows
                  .filter((row) => !row.skipped)
                  .length.toLocaleString()} source rows.`
              : `${controller.resultRows.length.toLocaleString()} retained rows will be included in the CSV, regardless of table filters or pagination.`}
          </p>
          <div className="grid gap-2 lg:flex">
            <Button asChild variant="outline">
              <Link href="/start-membership">
                {controller.mode === "public"
                  ? "Import full list"
                  : "Import list"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button type="button" onClick={controller.downloadResults}>
              <Download className="size-4" />
              {controller.mode === "public"
                ? "Download sample"
                : "Download CSV"}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {controller.mode === "pro" ? (
        <CatalogImporterReviewSheet
          controller={controller}
          onOpenChange={handleReviewSheetOpenChange}
        />
      ) : null}
    </section>
  );
}
