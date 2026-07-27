"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";
import { revalidateDashboardDbInBackground } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  getCatalogImportRowDisposition,
  prepareCatalogImportListing,
} from "@/lib/catalog-importer";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import { getCatalogImportExistingListingMatch } from "@/lib/catalog-import-existing-listings";
import { api } from "@/trpc/react";
import { DashboardImportExcludedRows } from "./dashboard-import-excluded-rows";
import { DashboardImportAlreadyExistingRows } from "./dashboard-import-existing-listings";
import { DashboardImportStartOver } from "./dashboard-import-start-over";
import { DashboardImportTable } from "./dashboard-import-table";

const IMPORT_BATCH_SIZE = 100;
const IMPORT_BUILDER_HREF = "/catalog-importer?returnTo=%2Fdashboard%2Fimports";
const EMPTY_EXISTING_COUNTS = new Map<string, number>();

function getImportErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    (error.message.includes("Upgrade to Pro") ||
      error.message.includes("Cultivar reference not found") ||
      error.message.includes("Review the existing listing"))
  ) {
    return error.message;
  }

  return "Your import is still saved. Try creating the listings again.";
}

function ExcludedImportGroup({
  count,
  description,
  title,
}: {
  count: number;
  description: string;
  title: string;
}) {
  if (count === 0) return null;

  return (
    <div className="flex flex-col gap-1 border-t py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="font-medium">
          {count.toLocaleString()} {title}
        </p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

export function DashboardCatalogImporter({
  initialDraft,
}: {
  initialDraft: CatalogImporterDraft | null;
}) {
  const controller = useCatalogImporterWorkbench(initialDraft);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string> | null>(
    null,
  );
  const [importedRowIds, setImportedRowIds] = useState(() => new Set<string>());
  const [importError, setImportError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{
    alreadyExistedCount: number;
    createdCount: number;
    remainingCount: number;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const importRows = api.dashboardDb.listing.importRows.useMutation();
  const { userId: dashboardUserId } = useDashboardDb();
  const existingListings = api.dashboardDb.listing.list.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const listingRows = useMemo(
    () =>
      (controller.matchedRows ?? []).filter((row) => row.rowKind === "listing"),
    [controller.matchedRows],
  );
  const includedRows = useMemo(
    () =>
      listingRows.filter(
        (row) => getCatalogImportRowDisposition(row) !== "excluded",
      ),
    [listingRows],
  );
  const reviewRows = useMemo(
    () =>
      listingRows.filter(
        (row) => getCatalogImportRowDisposition(row) === "review",
      ),
    [listingRows],
  );
  const issueRows = useMemo(
    () =>
      listingRows.filter(
        (row) => getCatalogImportRowDisposition(row) === "issue",
      ),
    [listingRows],
  );
  const eligibleRows = useMemo(
    () =>
      listingRows.filter(
        (row) => getCatalogImportRowDisposition(row) === "ready",
      ),
    [listingRows],
  );
  const existingMatchRows = useMemo(
    () =>
      eligibleRows.flatMap((row) => {
        const comparable = prepareCatalogImportListing(row);
        const match = getCatalogImportExistingListingMatch(
          comparable,
          existingListings.data ?? [],
        );
        return match.kind === "none" ? [] : [{ comparable, match, row }];
      }),
    [eligibleRows, existingListings.data],
  );
  const existingRowIds = useMemo(
    () => new Set(existingMatchRows.map(({ row }) => row.id)),
    [existingMatchRows],
  );
  const readyRows = useMemo(
    () =>
      eligibleRows.filter(
        (row) => !existingRowIds.has(row.id) && !importedRowIds.has(row.id),
      ),
    [eligibleRows, existingRowIds, importedRowIds],
  );
  const readyRowIds = useMemo(
    () => new Set(readyRows.map((row) => row.id)),
    [readyRows],
  );
  const defaultSelectedRowIds = useMemo(
    () =>
      new Set(
        readyRows.slice(0, IMPORT_BATCH_SIZE).map((currentRow) => currentRow.id),
      ),
    [readyRows],
  );
  const effectiveSelectedRowIds =
    selectedRowIds ?? defaultSelectedRowIds;
  const selectedReadyRows = useMemo(
    () => readyRows.filter((row) => effectiveSelectedRowIds.has(row.id)),
    [effectiveSelectedRowIds, readyRows],
  );
  const importedRows = useMemo(
    () =>
      eligibleRows.filter(
        (row) => importedRowIds.has(row.id) && !existingRowIds.has(row.id),
      ),
    [eligibleRows, existingRowIds, importedRowIds],
  );
  const builderExcludedCount = listingRows.length - includedRows.length;

  const setRowSelected = useCallback((rowId: string, selected: boolean) => {
    setSelectedRowIds((current) => {
      const next = new Set(current ?? defaultSelectedRowIds);
      if (selected && next.size < IMPORT_BATCH_SIZE) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }, [defaultSelectedRowIds]);

  const setRowsSelected = useCallback((rowIds: string[], selected: boolean) => {
    setSelectedRowIds((current) => {
      const next = new Set(current ?? defaultSelectedRowIds);
      for (const rowId of rowIds) {
        if (selected && next.size < IMPORT_BATCH_SIZE) next.add(rowId);
        else if (!selected) next.delete(rowId);
      }
      return next;
    });
  }, [defaultSelectedRowIds]);

  const startOver = () => {
    controller.resetImporter();
    setSelectedRowIds(null);
    setImportedRowIds(new Set());
    setImportError(null);
    setBatchResult(null);
    setConfirmOpen(false);
  };

  const runImport = async () => {
    setImportError(null);
    setBatchResult(null);
    const rows = selectedReadyRows.map((row) => ({
      ...prepareCatalogImportListing(row),
      allowExistingDuplicate: false,
      importKey: `${controller.projectId}:${row.id}`,
    }));

    if (rows.length === 0) {
      setImportError("Select at least one listing to import.");
      return;
    }
    if (rows.length > IMPORT_BATCH_SIZE) {
      setImportError("Select no more than 100 listings.");
      return;
    }

    try {
      const result = await importRows.mutateAsync({ rows });
      const importedIds = selectedReadyRows.map((row) => row.id);
      setImportedRowIds((current) => new Set([...current, ...importedIds]));
      setSelectedRowIds(null);
      setBatchResult({
        alreadyExistedCount:
          result.existingCount + result.skippedExactCount,
        createdCount: result.createdCount,
        remainingCount: Math.max(0, readyRows.length - rows.length),
      });
      if (dashboardUserId) {
        await revalidateDashboardDbInBackground(dashboardUserId);
      }
    } catch (error) {
      setImportError(getImportErrorMessage(error));
    }
  };

  if (!controller.matchedRows) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>
            {controller.parsedSpreadsheet
              ? "Finish building your import"
              : "Build an import first"}
          </EmptyTitle>
          <EmptyDescription>
            Map the spreadsheet, review cultivar matches, and fix data in the
            shared import builder.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href={IMPORT_BUILDER_HREF}>
              {controller.parsedSpreadsheet
                ? "Continue building import"
                : "Build import"}
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
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
    <div className="space-y-6">
      <div className="absolute top-0 right-0">
        <DashboardImportStartOver
          disabled={importRows.isPending}
          onStartOver={startOver}
        />
      </div>

      <section className="space-y-6" aria-labelledby="import-summary-heading">
        <div>
          <h2
            id="import-summary-heading"
            className="text-3xl font-semibold tracking-tight"
          >
            {readyRows.length === 0
              ? importedRows.length > 0
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
            <p className="text-muted-foreground mt-2">
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

        {batchResult ? (
          <Alert>
            <AlertTitle>
              {batchResult.createdCount.toLocaleString()}{" "}
              {batchResult.createdCount === 1 ? "listing" : "listings"} imported
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

        {readyRows.length > 0 ? (
          <DashboardImportTable
            key={importedRowIds.size}
            controller={controller}
            existingDuplicateCounts={EMPTY_EXISTING_COUNTS}
            onRowSelectionChange={setRowSelected}
            onRowsSelectionChange={setRowsSelected}
            rowIds={readyRowIds}
            selectionLimit={IMPORT_BATCH_SIZE}
            selectedRowIds={effectiveSelectedRowIds}
            view="all"
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href={IMPORT_BUILDER_HREF}>Return to import builder</Link>
          </Button>
          {readyRows.length > 0 ? (
            <Button
              type="button"
              disabled={selectedReadyRows.length === 0 || importRows.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {importRows.isPending ? (
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
          ) : importedRows.length > 0 ? (
            <Button asChild>
              <Link href="/dashboard/listings">View listings</Link>
            </Button>
          ) : null}
        </div>

        <DashboardImportAlreadyExistingRows
          importedRows={importedRows}
          rows={existingMatchRows}
        />

        <div className="space-y-6">
          <DashboardImportExcludedRows
            controller={controller}
            kind="review"
            rows={reviewRows}
          />
          <DashboardImportExcludedRows
            controller={controller}
            kind="issues"
            rows={issueRows}
          />
          <ExcludedImportGroup
            count={builderExcludedCount}
            title={
              builderExcludedCount === 1
                ? "listing was excluded in the builder"
                : "listings were excluded in the builder"
            }
            description="These listings will not be imported."
          />
        </div>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
            <AlertDialogAction onClick={() => void runImport()}>
              Import listings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {controller.liveAnnouncement}
      </div>
    </div>
  );
}
