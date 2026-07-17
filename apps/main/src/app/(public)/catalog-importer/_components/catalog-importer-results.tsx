"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableLayout } from "@/components/data-table/data-table-layout";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
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
import { CatalogImporterIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-issues";
import { CatalogImporterMatchSheet } from "@/app/(public)/catalog-importer/_components/catalog-importer-match-sheet";
import { getCatalogImporterResultColumns } from "@/app/(public)/catalog-importer/_components/catalog-importer-result-columns";
import { CatalogImporterReviewQuiz } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-quiz";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImportRow } from "@/lib/catalog-importer";

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

interface CatalogImporterResultsProps {
  controller: CatalogImporterWorkbenchController;
}

export function CatalogImporterResults({
  controller,
}: CatalogImporterResultsProps) {
  const defaultPageSizeAppliedRef = useRef(false);
  const [matchEditorRowId, setMatchEditorRowId] = useState<string | null>(null);
  const linkedRows = useMemo(
    () => controller.resultRows.filter((row) => row.match !== null),
    [controller.resultRows],
  );
  const matchEditorRow =
    linkedRows.find((row) => row.id === matchEditorRowId) ?? null;
  const handleOpenReview = useCallback((row: CatalogImportRow) => {
    setMatchEditorRowId(row.id);
  }, []);
  const columns = useMemo(
    () =>
      getCatalogImporterResultColumns({
        mapping: controller.mapping,
        onOpenReview: handleOpenReview,
      }),
    [controller.mapping, handleOpenReview],
  );
  const table = useDataTable({
    data: linkedRows,
    columns,
    storageKey: "catalog-importer-matches-simple",
    columnNames: {
      description: "Description",
      image: "Image",
      matchConfidence: "Match",
      price: "Price",
      privateNote: "Private note",
      registryDetails: "Registry details",
      sourceRow: "Source row",
      title: "Name",
    },
    pinnedColumns: {
      left: ["title"],
      right: [],
    },
    initialStateOverrides: {
      pagination: { pageIndex: 0, pageSize: 20 },
      columnVisibility: {
        sourceRow: false,
      },
    },
    config: {
      state: {
        columnFilters: [],
        globalFilter: "",
      },
    },
  });
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
      Math.ceil(linkedRows.length / Math.max(pageSize, 1)),
    );
    if (pageIndex >= pageCount) {
      table.setPageIndex(pageCount - 1);
    }
  }, [linkedRows.length, pageIndex, pageSize, table]);

  return (
    <div className="min-w-0 space-y-4">
      <Card
        role="region"
        aria-labelledby="catalog-importer-results-heading"
        className="min-w-0 overflow-hidden shadow-sm"
      >
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between lg:space-y-0">
          <div className="space-y-1.5">
            <CardTitle
              id="catalog-importer-results-heading"
              role="heading"
              aria-level={2}
              tabIndex={-1}
            >
              Matches
            </CardTitle>
            <CardDescription>
              {controller.mode === "public"
                ? "A free sample of confident matches from your workbook."
                : "Select a percentage to review or change a cultivar match."}
            </CardDescription>
          </div>
          <p className="text-muted-foreground text-sm tabular-nums">
            {linkedRows.length.toLocaleString()} rows
          </p>
        </CardHeader>

        <CardContent className="min-w-0 p-4 pt-0 lg:p-6 lg:pt-0">
          <DataTableLayout
            table={table}
            pagination={
              <DataTablePagination
                table={table}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            }
            noResults={
              <div className="rounded-lg border border-dashed p-10 text-center">
                <p className="text-muted-foreground text-sm">
                  No linked matches yet.
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
              : `${controller.resultRows.length.toLocaleString()} retained rows will be included in the CSV.`}
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

      <CatalogImporterIssues controller={controller} />

      {controller.mode === "pro" ? (
        <CatalogImporterReviewQuiz controller={controller} />
      ) : null}

      <CatalogImporterMatchSheet
        key={matchEditorRow?.id ?? "closed"}
        controller={controller}
        open={matchEditorRow !== null}
        row={matchEditorRow}
        onOpenChange={(open) => {
          if (!open) {
            setMatchEditorRowId(null);
          }
        }}
      />
    </div>
  );
}
