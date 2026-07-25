"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";
import { revalidateDashboardDbInBackground } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  getCatalogImportRowDisposition,
  prepareCatalogImportListing,
} from "@/lib/catalog-importer";
import {
  clearCatalogImporterDraft,
  type CatalogImporterDraft,
} from "@/lib/catalog-importer-draft";
import { getCatalogImportExistingListingMatch } from "@/lib/catalog-import-existing-listings";
import { api } from "@/trpc/react";
import { DashboardImportExcludedRows } from "./dashboard-import-excluded-rows";
import { DashboardImportAlreadyExistingRows } from "./dashboard-import-existing-listings";
import { DashboardImportStartOver } from "./dashboard-import-start-over";
import { DashboardImportTable } from "./dashboard-import-table";

type DashboardImportStep = "complete" | "confirm" | "ready";

const IMPORT_BATCH_SIZE = 100;
const IMPORT_BUILDER_HREF = "/catalog-importer?returnTo=%2Fdashboard%2Fimports";
const EMPTY_EXISTING_COUNTS = new Map<string, number>();

function getDashboardImportStepId(step: DashboardImportStep) {
  return `dashboard-catalog-import-step-${step}`;
}

function scrollToImportStep(step: DashboardImportStep) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const stepTarget = document.getElementById(
        getDashboardImportStepId(step),
      );
      const workflow = document.getElementById(
        "dashboard-catalog-import-workflow",
      );
      (stepTarget ?? workflow)?.scrollIntoView?.({ block: "start" });
    }),
  );
}

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

function StepButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "border-foreground text-foreground border-b-2 px-1 py-3 text-sm font-medium"
          : "text-muted-foreground hover:text-foreground border-b-2 border-transparent px-1 py-3 text-sm font-medium"
      }
    >
      {children}
    </button>
  );
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
  const [step, setStep] = useState<DashboardImportStep>("ready");
  const [selectedRowIds, setSelectedRowIds] = useState(
    () =>
      new Set(
        (initialDraft?.matchedRows ?? [])
          .filter(
            (row) =>
              row.rowKind === "listing" && row.outputState === "included",
          )
          .map((row) => row.id),
      ),
  );
  const [importProgress, setImportProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<{
    createdCount: number;
    existingCount: number;
    skippedCount: number;
  } | null>(null);
  const importRows = api.dashboardDb.listing.importRows.useMutation();
  const apiUtils = api.useUtils();
  const { userId: dashboardUserId } = useDashboardDb();
  const existingListings = api.dashboardDb.listing.list.useQuery();

  const listingRows = useMemo(
    () =>
      (controller.matchedRows ?? []).filter((row) => row.rowKind === "listing"),
    [controller.matchedRows],
  );
  const includedRows = listingRows.filter(
    (row) => getCatalogImportRowDisposition(row) !== "excluded",
  );
  const reviewRows = listingRows.filter(
    (row) => getCatalogImportRowDisposition(row) === "review",
  );
  const issueRows = listingRows.filter(
    (row) => getCatalogImportRowDisposition(row) === "issue",
  );
  const eligibleRows = listingRows.filter(
    (row) => getCatalogImportRowDisposition(row) === "ready",
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
  const existingRowIds = new Set(existingMatchRows.map(({ row }) => row.id));
  const readyRows = eligibleRows.filter((row) => !existingRowIds.has(row.id));
  const readyRowIds = new Set(readyRows.map((row) => row.id));
  const selectedReadyRows = readyRows.filter((row) =>
    selectedRowIds.has(row.id),
  );
  const builderExcludedCount = listingRows.length - includedRows.length;

  const changeStep = (nextStep: DashboardImportStep) => {
    setStep(nextStep);
    scrollToImportStep(nextStep);
  };

  const setRowSelected = (rowId: string, selected: boolean) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (selected) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  };

  const setRowsSelected = (rowIds: string[], selected: boolean) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      rowIds.forEach((rowId) => {
        if (selected) next.add(rowId);
        else next.delete(rowId);
      });
      return next;
    });
  };

  const startOver = () => {
    controller.resetImporter();
    setSelectedRowIds(new Set());
    setImportProgress(null);
    setImportError(null);
    setCompletion(null);
    changeStep("ready");
  };

  const runImport = async () => {
    setImportError(null);
    const rows = selectedReadyRows.map((row) => ({
      ...prepareCatalogImportListing(row),
      allowExistingDuplicate: false,
      importKey: `${controller.projectId}:${row.id}`,
    }));

    if (rows.length === 0) {
      setImportError("Select at least one listing to import.");
      return;
    }

    setImportProgress({ completed: 0, total: rows.length });
    let createdCount = 0;
    let existingCount = 0;
    let serverSkippedCount = 0;

    try {
      for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(start, start + IMPORT_BATCH_SIZE);
        const result = await importRows.mutateAsync({ rows: batch });
        createdCount += result.createdCount;
        existingCount += result.existingCount;
        serverSkippedCount += result.skippedExactCount;
        setImportProgress({
          completed: Math.min(start + batch.length, rows.length),
          total: rows.length,
        });
      }

      await clearCatalogImporterDraft();
      await apiUtils.dashboardDb.listing.list.invalidate();
      if (dashboardUserId) {
        await revalidateDashboardDbInBackground(dashboardUserId);
      }
      setCompletion({
        createdCount,
        existingCount,
        skippedCount: existingMatchRows.length + serverSkippedCount,
      });
      changeStep("complete");
    } catch (error) {
      setImportError(getImportErrorMessage(error));
    } finally {
      setImportProgress(null);
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
          disabled={importProgress !== null}
          onStartOver={startOver}
        />
      </div>

      {step !== "complete" ? (
        <nav className="flex gap-5 border-b" aria-label="Catalog import steps">
          <StepButton
            active={step === "ready"}
            onClick={() => changeStep("ready")}
          >
            Select {selectedReadyRows.length}/{readyRows.length}
          </StepButton>
          <StepButton
            active={step === "confirm"}
            onClick={() => changeStep("confirm")}
          >
            Import
          </StepButton>
        </nav>
      ) : null}

      {step === "ready" ? (
        <section
          id={getDashboardImportStepId("ready")}
          className="scroll-mt-4 space-y-6"
          aria-labelledby="import-summary-heading"
        >
          <div>
            <h2
              id="import-summary-heading"
              className="text-3xl font-semibold tracking-tight"
            >
              {readyRows.length === 0
                ? "No listings can be imported yet"
                : readyRows.length === 1
                  ? "1 listing can be imported"
                  : `${readyRows.length.toLocaleString()} listings can be imported`}
            </h2>
            {readyRows.length > 0 ? (
              <p className="text-muted-foreground mt-2">
                Choose the listings to create.
              </p>
            ) : null}
          </div>

          {readyRows.length > 0 ? (
            <DashboardImportTable
              controller={controller}
              existingDuplicateCounts={EMPTY_EXISTING_COUNTS}
              onRowSelectionChange={setRowSelected}
              onRowsSelectionChange={setRowsSelected}
              rowIds={readyRowIds}
              selectedRowIds={selectedRowIds}
              view="all"
            />
          ) : null}

          <DashboardImportAlreadyExistingRows rows={existingMatchRows} />

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

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline">
              <Link href={IMPORT_BUILDER_HREF}>Return to import builder</Link>
            </Button>
            <Button
              type="button"
              disabled={selectedReadyRows.length === 0}
              onClick={() => changeStep("confirm")}
            >
              Continue to import
              <ArrowRight />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "confirm" ? (
        <section
          id={getDashboardImportStepId("confirm")}
          className="mx-auto max-w-3xl scroll-mt-4 space-y-6 py-4"
        >
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Create {selectedReadyRows.length.toLocaleString()}{" "}
              {selectedReadyRows.length === 1 ? "listing" : "listings"}?
            </h2>
            <p className="text-muted-foreground mt-2">
              Existing listings and unresolved rows will not be imported.
            </p>
          </div>

          <dl className="grid gap-4 border-y py-5 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-sm">Ready to create</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {selectedReadyRows.length.toLocaleString()}
              </dd>
            </div>
            {existingMatchRows.length > 0 ? (
              <div>
                <dt className="text-muted-foreground text-sm">
                  Already in your catalog
                </dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {existingMatchRows.length.toLocaleString()}
                </dd>
              </div>
            ) : null}
            {reviewRows.length + issueRows.length > 0 ? (
              <div>
                <dt className="text-muted-foreground text-sm">
                  Unresolved and excluded
                </dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {(reviewRows.length + issueRows.length).toLocaleString()}
                </dd>
              </div>
            ) : null}
            {readyRows.length - selectedReadyRows.length > 0 ? (
              <div>
                <dt className="text-muted-foreground text-sm">Not selected</dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {(
                    readyRows.length - selectedReadyRows.length
                  ).toLocaleString()}
                </dd>
              </div>
            ) : null}
          </dl>

          {importError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Import did not finish</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          ) : null}

          {importProgress ? (
            <div
              className="flex flex-col gap-2"
              role="status"
              aria-label="Creating listings"
            >
              <div className="text-muted-foreground flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <Spinner />
                  Creating listings…
                </span>
                <span className="tabular-nums">
                  {importProgress.completed.toLocaleString()} /{" "}
                  {importProgress.total.toLocaleString()}
                </span>
              </div>
              <Progress
                value={
                  (importProgress.completed /
                    Math.max(importProgress.total, 1)) *
                  100
                }
                aria-label="Listing creation progress"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={importProgress !== null}
              onClick={() => changeStep("ready")}
            >
              Back to selection
            </Button>
            <Button
              type="button"
              disabled={
                selectedReadyRows.length === 0 || importProgress !== null
              }
              onClick={() => void runImport()}
            >
              {importError
                ? "Retry import"
                : `Create ${selectedReadyRows.length.toLocaleString()} ${selectedReadyRows.length === 1 ? "listing" : "listings"}`}
            </Button>
          </div>
        </section>
      ) : null}

      {step === "complete" && completion ? (
        <section
          id={getDashboardImportStepId("complete")}
          className="mx-auto max-w-3xl scroll-mt-4 py-12 text-center"
        >
          <CheckCircle2 className="text-primary mx-auto size-10" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Your catalog has been imported
          </h2>
          <p className="text-muted-foreground mt-3">
            {completion.createdCount.toLocaleString()}{" "}
            {completion.createdCount === 1 ? "listing was" : "listings were"}{" "}
            created.
            {completion.skippedCount > 0
              ? ` ${completion.skippedCount.toLocaleString()} already in your catalog were skipped.`
              : ""}
            {completion.existingCount > 0
              ? ` ${completion.existingCount.toLocaleString()} previously imported listings were left unchanged.`
              : ""}
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/listings">View listings</Link>
          </Button>
        </section>
      ) : null}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {controller.liveAnnouncement}
      </div>
    </div>
  );
}
