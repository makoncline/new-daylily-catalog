"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import { DashboardImportExcludedRows } from "./dashboard-import-excluded-rows";
import { DashboardImportAlreadyExistingRows } from "./dashboard-import-existing-listings";
import { DashboardImportStartOver } from "./dashboard-import-start-over";
import { DashboardImportTable } from "./dashboard-import-table";
import {
  IMPORT_BATCH_SIZE,
  IMPORT_BUILDER_HREF,
} from "./dashboard-import-config";
import { useDashboardCatalogImport } from "./use-dashboard-catalog-import";

export function DashboardCatalogImporter({
  initialDraft,
}: {
  initialDraft: CatalogImporterDraft | null;
}) {
  const {
    batchResult,
    builderExcludedRows,
    existingListings,
    existingMatchRows,
    getSourceCellsForRow,
    hasPreparedRows,
    hasSpreadsheet,
    importedRows,
    importedRowCount,
    importError,
    isImporting,
    isRefreshing,
    issueRows,
    liveAnnouncement,
    projectId,
    readyRows,
    refreshWarning,
    retryRefresh,
    reviewRows,
    runImport,
    selectedReadyRows,
    selectedRowIds,
    setRowSelected,
    setRowsSelected,
    startOver,
  } = useDashboardCatalogImport(initialDraft);
  if (!hasPreparedRows) {
    return (
      <section
        className="flex max-w-xl flex-col gap-6 py-4"
        aria-labelledby="dashboard-import-empty-heading"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="dashboard-import-empty-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {hasSpreadsheet
              ? "Finish building your import"
              : "Build an import first"}
          </h2>
          <p className="text-muted-foreground text-sm leading-6">
            Map the spreadsheet, review cultivar matches, and fix data in the
            shared import builder.
          </p>
        </div>
        <div>
          <Button asChild>
            <Link href={IMPORT_BUILDER_HREF}>
              {hasSpreadsheet ? "Continue building import" : "Build import"}
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  if (existingListings.isLoading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
        <Spinner />
        Checking your existing catalog…
      </p>
    );
  }

  if (existingListings.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Your existing catalog could not be checked</AlertTitle>
          <AlertDescription>
            Your import is still saved locally.
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => void existingListings.refetch()}
        >
          Retry check
        </Button>
      </div>
    );
  }

  return (
    <AlertDialog>
      <div
        className="flex min-w-0 flex-col gap-10"
        data-ph-capture-attribute-flow="catalog-importer"
        data-ph-capture-attribute-import_id={projectId}
        data-ph-capture-attribute-step="dashboard-import"
      >
        <section
          className="flex flex-col gap-8"
          aria-labelledby="import-summary-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h2
                id="import-summary-heading"
                className="text-xl font-semibold tracking-tight"
              >
                {readyRows.length === 0
                  ? importedRows.length + existingMatchRows.length > 0
                    ? "All ready listings are in your catalog"
                    : "No listings can be imported yet"
                  : batchResult
                    ? readyRows.length === 1
                      ? "1 listing remains"
                      : `${readyRows.length.toLocaleString()} listings remain`
                    : readyRows.length === 1
                      ? "1 listing is ready to import"
                      : `${readyRows.length.toLocaleString()} listings are ready to import`}
              </h2>
              {readyRows.length > 0 ? (
                <p className="text-muted-foreground">
                  Import up to 100 listings at a time.{" "}
                  <span className="text-foreground font-medium">
                    {selectedReadyRows.length.toLocaleString()} of{" "}
                    {Math.min(
                      IMPORT_BATCH_SIZE,
                      readyRows.length,
                    ).toLocaleString()}{" "}
                    selected.
                  </span>
                </p>
              ) : null}
            </div>
            <DashboardImportStartOver
              disabled={isImporting}
              onStartOver={startOver}
            />
          </div>

          {batchResult ? (
            <Alert>
              <AlertTitle>
                {batchResult.createdCount.toLocaleString()}{" "}
                {batchResult.createdCount === 1 ? "listing" : "listings"}{" "}
                imported
              </AlertTitle>
              <AlertDescription>
                {batchResult.alreadyExistedCount > 0
                  ? `${batchResult.alreadyExistedCount.toLocaleString()} already ${
                      batchResult.alreadyExistedCount === 1 ? "exists" : "exist"
                    }. `
                  : null}
                {batchResult.remainingCount.toLocaleString()}{" "}
                {batchResult.remainingCount === 1
                  ? "listing remains"
                  : "listings remain"}
                .
              </AlertDescription>
            </Alert>
          ) : null}

          {importError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Import did not finish</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          ) : null}

          {refreshWarning ? (
            <Alert>
              <AlertTitle>
                Listings were saved. Dashboard refresh did not finish.
              </AlertTitle>
              <AlertDescription>
                <p>
                  Your import progress is saved. Retry the dashboard refresh.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void retryRefresh()}
                  disabled={isImporting || isRefreshing}
                >
                  Retry refresh
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {readyRows.length > 0 ? (
            <DashboardImportTable
              key={importedRowCount}
              rows={readyRows}
              disabled={isImporting}
              onRowSelectionChange={setRowSelected}
              onRowsSelectionChange={setRowsSelected}
              selectionLimit={IMPORT_BATCH_SIZE}
              selectedRowIds={selectedRowIds}
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {isImporting ? (
              <Button variant="outline" disabled>
                Return to import builder
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href={IMPORT_BUILDER_HREF}>Return to import builder</Link>
              </Button>
            )}
            {readyRows.length > 0 ? (
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  disabled={selectedReadyRows.length === 0 || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Spinner />
                      Importing…
                    </>
                  ) : (
                    `Import ${selectedReadyRows.length.toLocaleString()} ${
                      selectedReadyRows.length === 1 ? "listing" : "listings"
                    }`
                  )}
                </Button>
              </AlertDialogTrigger>
            ) : importedRows.length + existingMatchRows.length > 0 ? (
              <Button asChild>
                <Link href="/dashboard/listings">View listings</Link>
              </Button>
            ) : null}
          </div>

          <DashboardImportAlreadyExistingRows
            importedRows={importedRows}
            rows={existingMatchRows}
          />

          <div className="flex flex-col gap-10">
            <DashboardImportExcludedRows
              getSourceCellsForRow={getSourceCellsForRow}
              kind="review"
              rows={reviewRows}
            />
            <DashboardImportExcludedRows
              getSourceCellsForRow={getSourceCellsForRow}
              kind="issues"
              rows={issueRows}
            />
            <DashboardImportExcludedRows
              getSourceCellsForRow={getSourceCellsForRow}
              kind="builder"
              rows={builderExcludedRows}
            />
          </div>
        </section>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Import {selectedReadyRows.length.toLocaleString()}{" "}
              {selectedReadyRows.length === 1 ? "listing" : "listings"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              These listings will be added to your catalog.
              {readyRows.length - selectedReadyRows.length > 0
                ? ` ${(
                    readyRows.length - selectedReadyRows.length
                  ).toLocaleString()} ${
                    readyRows.length - selectedReadyRows.length === 1
                      ? "listing will"
                      : "listings will"
                  } remain.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-ph-capture-attribute-action="import-catalog"
              disabled={isImporting || selectedReadyRows.length === 0}
              onClick={() => void runImport()}
            >
              Import listings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </div>
      </div>
    </AlertDialog>
  );
}
