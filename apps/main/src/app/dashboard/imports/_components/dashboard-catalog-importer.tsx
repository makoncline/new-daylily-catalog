"use client";

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
import { DashboardImportStartOver } from "./dashboard-import-start-over";
import { DashboardImportTable } from "./dashboard-import-table";
import { IMPORT_BATCH_SIZE } from "./dashboard-import-config";
import { useDashboardCatalogImport } from "./use-dashboard-catalog-import";

export function DashboardCatalogImporter({
  initialDraft,
}: {
  initialDraft: CatalogImporterDraft | null;
}) {
  const state = useDashboardCatalogImport(initialDraft);
  if (!state.hasPreparedRows) {
    return (
      <div className="flex flex-col items-start gap-4 py-4">
        <p>Prepare a spreadsheet or name list for import.</p>
        <Button asChild>
          <Link href={state.builderHref}>Import a spreadsheet or list</Link>
        </Button>
      </div>
    );
  }
  if (
    state.existingListings.isLoading ||
    (state.existingListings.isFetching &&
      !state.isImporting &&
      state.importedRowCount === 0)
  )
    return (
      <p className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
        <Spinner />
        Checking your catalog…
      </p>
    );
  if (state.existingListings.isError && !state.importedRowCount)
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert variant="destructive">
          <AlertTitle>Could not check your catalog</AlertTitle>
          <AlertDescription>
            Your prepared import is still saved.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => void state.existingListings.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  return (
    <AlertDialog>
      <div
        className="flex min-w-0 flex-col gap-6"
        data-ph-capture-attribute-flow="catalog-importer"
        data-ph-capture-attribute-import_id={state.projectId}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">
              {state.readyRows.length
                ? `${state.readyRows.length} ready to import`
                : state.importedRowCount
                  ? state.remainingCount
                    ? "Import needs attention"
                    : "Selected rows saved"
                  : "Nothing ready to import"}
            </h2>
            {state.readyRows.length ? (
              <p className="text-muted-foreground text-sm">
                {state.newRowCount} new · {state.reusedRowCount} already saved
                {state.skippedRowCount
                  ? ` · ${state.skippedRowCount} skipped`
                  : ""}{" "}
                · {state.listCount} {state.listCount === 1 ? "list" : "lists"}
              </p>
            ) : null}
          </div>
          <DashboardImportStartOver
            disabled={state.isImporting}
            onStartOver={state.startOver}
          />
        </div>
        {state.readyRows.length ? (
          <p className="text-muted-foreground text-sm">
            Different names, prices, descriptions, private notes, or cultivar
            links create separate listings. Equivalent listings keep their
            current details. Explicit lists can gain membership. Each source row
            is saved once.
          </p>
        ) : null}
        {state.storageWarning ? (
          <Alert variant="destructive">
            <AlertDescription>{state.storageWarning}</AlertDescription>
          </Alert>
        ) : null}
        {state.batchResult ? (
          <Alert>
            <AlertTitle>
              {state.batchResult.createdCount} created ·{" "}
              {state.batchResult.alreadyExistedCount} already saved · details
              unchanged
            </AlertTitle>
            <AlertDescription>
              {state.batchResult.skippedCount ? (
                <p>
                  {state.batchResult.skippedCount} skipped:{" "}
                  {state.batchResult.skippedNames.join(", ")}. Check these
                  manually after checking your catalog.
                </p>
              ) : null}
              {state.batchResult.skippedCount ? (
                <Button
                  variant="outline"
                  disabled={state.isImporting || state.refreshWarning}
                  onClick={state.retrySkipped}
                >
                  Retry skipped rows
                </Button>
              ) : null}
              {state.batchResult.remainingCount ? (
                <p>{state.batchResult.remainingCount} remain.</p>
              ) : null}
              <p>Your local copy is unchanged.</p>
            </AlertDescription>
          </Alert>
        ) : null}
        {state.importError ? (
          <Alert variant="destructive">
            <AlertTitle>Import did not finish</AlertTitle>
            <AlertDescription>{state.importError}</AlertDescription>
          </Alert>
        ) : null}
        {state.refreshWarning ? (
          <Alert>
            <AlertTitle>Saved. Dashboard refresh did not finish.</AlertTitle>
            <AlertDescription>
              <Button
                variant="outline"
                disabled={state.isImporting || state.isRefreshing}
                onClick={() => void state.retryRefresh()}
              >
                Retry refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {state.readyRows.length ? (
          <DashboardImportTable
            key={state.importedRowCount}
            rows={state.readyRows}
            rowActions={state.rowActions}
            disabled={state.isImporting}
            onRowSelectionChange={state.setRowSelected}
            onRowsSelectionChange={state.setRowsSelected}
            selectionLimit={IMPORT_BATCH_SIZE}
            selectedRowIds={state.selectedRowIds}
          />
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {state.isImporting ? (
            <Button variant="outline" disabled>
              Back to Playground
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={state.builderHref}>Back to Playground</Link>
            </Button>
          )}
          {state.readyRows.length ? (
            state.reusedRowCount ||
            state.skippedRowCount ||
            state.remainingCount > state.readyRows.length ? (
              <AlertDialogTrigger asChild>
                <Button
                  disabled={
                    !state.selectedReadyRows.length ||
                    state.isImporting ||
                    state.refreshWarning
                  }
                >
                  {state.isImporting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Importing…
                    </>
                  ) : (
                    `Import ${state.selectedReadyRows.length} ${state.selectedReadyRows.length === 1 ? "listing" : "listings"}`
                  )}
                </Button>
              </AlertDialogTrigger>
            ) : (
              <Button
                data-ph-capture-attribute-action="import-catalog"
                disabled={
                  !state.selectedReadyRows.length ||
                  state.isImporting ||
                  state.refreshWarning
                }
                onClick={() => void state.runImport()}
              >
                {state.isImporting
                  ? "Importing…"
                  : `Import ${state.selectedReadyRows.length} ${state.selectedReadyRows.length === 1 ? "listing" : "listings"}`}
              </Button>
            )
          ) : (
            <Button asChild>
              <Link href="/dashboard/listings">View catalog</Link>
            </Button>
          )}
        </div>
        {state.ambiguousRows.length ? (
          <Alert>
            <AlertTitle>
              {state.ambiguousRows.length} need manual review
            </AlertTitle>
            <AlertDescription>
              <p>
                More than one equivalent listing matches:{" "}
                {state.ambiguousRows
                  .map((item) => item.comparable.title)
                  .join(", ")}
                . These will be skipped.
              </p>
              <p>Review these equivalent listings in your dashboard.</p>
            </AlertDescription>
          </Alert>
        ) : null}
        <DashboardImportExcludedRows
          getSourceCellsForRow={state.getSourceCellsForRow}
          kind="review"
          rows={state.reviewRows}
        />
        <DashboardImportExcludedRows
          getSourceCellsForRow={state.getSourceCellsForRow}
          kind="issues"
          rows={state.issueRows}
        />
        <DashboardImportExcludedRows
          getSourceCellsForRow={state.getSourceCellsForRow}
          kind="builder"
          rows={state.builderExcludedRows}
        />
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {state.liveAnnouncement}
        </div>
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Import {state.selectedReadyRows.length}{" "}
            {state.selectedReadyRows.length === 1 ? "listing" : "listings"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            New listings and missing lists will be created. Existing listing
            details stay unchanged. Your Playground catalog stays in this
            browser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={state.isImporting || !state.selectedReadyRows.length}
            onClick={() => void state.runImport()}
          >
            Import listings
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
