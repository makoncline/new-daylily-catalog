"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { CatalogImporterIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-issues";
import { CatalogImporterManualTable } from "@/app/(public)/catalog-importer/_components/catalog-importer-manual-table";
import { CatalogImporterMapping } from "@/app/(public)/catalog-importer/_components/catalog-importer-mapping";
import { CatalogImporterMatchSheet } from "@/app/(public)/catalog-importer/_components/catalog-importer-match-sheet";
import { CatalogImporterReviewQuiz } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-quiz";
import { CatalogImporterUpload } from "@/app/(public)/catalog-importer/_components/catalog-importer-upload";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";
import { revalidateDashboardDbInBackground } from "@/app/dashboard/_lib/dashboard-db/dashboard-db-persistence";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { clearCatalogImporterDraft } from "@/lib/catalog-importer-draft";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import type { CatalogImportRow } from "@/lib/catalog-importer";
import {
  getCatalogImportExistingListingMatch,
  type CatalogImportComparableListing,
} from "@/lib/catalog-import-existing-listings";
import { api } from "@/trpc/react";
import { DashboardImportStartOver } from "./dashboard-import-start-over";
import { DashboardImportTable } from "./dashboard-import-table";
import {
  DashboardImportAlreadyExistingRows,
  DashboardImportExistingListingReview,
  type DashboardImportExistingMatchRow,
} from "./dashboard-import-existing-listings";

type DashboardImportStep =
  | "complete"
  | "confirm"
  | "existing"
  | "issues"
  | "prepare"
  | "ready"
  | "review"
  | "start";

const IMPORT_BATCH_SIZE = 100;

function appendOriginalPrice(privateNote: string, sourcePrice: string) {
  if (!sourcePrice) return privateNote;
  const line = `Original price: ${sourcePrice}`;
  return privateNote.split("\n").includes(line)
    ? privateNote
    : [privateNote, line].filter(Boolean).join("\n");
}

function getPreparedListing(
  row: CatalogImportRow,
): CatalogImportComparableListing {
  return {
    cultivarReferenceId:
      row.cultivarReferenceIdWarning === null
        ? (row.match?.cultivarReferenceId ?? null)
        : null,
    description: row.description.trim() || null,
    price: row.priceWarning === null ? row.price : null,
    privateNote:
      (row.priceWarning
        ? appendOriginalPrice(row.privateNote, row.sourcePrice)
        : row.privateNote
      ).trim() || null,
    title: row.match?.displayName ?? row.title,
  };
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

  return "Your progress is still saved. Try creating the listings again.";
}

function StepButton({
  active,
  children,
  disabled = false,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        active
          ? "border-foreground text-foreground border-b-2 px-1 py-3 text-sm font-medium"
          : "text-muted-foreground hover:text-foreground disabled:text-muted-foreground/40 border-b-2 border-transparent px-1 py-3 text-sm font-medium"
      }
    >
      {children}
    </button>
  );
}

export function DashboardCatalogImporter({
  initialDraft,
}: {
  initialDraft: CatalogImporterDraft | null;
}) {
  const controller = useCatalogImporterWorkbench(initialDraft);
  const [step, setStep] = useState<DashboardImportStep>(() =>
    initialDraft?.matchedRows
      ? "ready"
      : initialDraft?.parsedSpreadsheet
        ? "prepare"
        : "start",
  );
  const [matchSheetRow, setMatchSheetRow] = useState<CatalogImportRow | null>(
    null,
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
  const existingMatchRows = useMemo<DashboardImportExistingMatchRow[]>(
    () =>
      listingRows.flatMap((row) => {
        const comparable = getPreparedListing(row);
        const match = getCatalogImportExistingListingMatch(
          comparable,
          existingListings.data ?? [],
        );
        return match.kind === "none" ? [] : [{ comparable, match, row }];
      }),
    [existingListings.data, listingRows],
  );
  const existingMatchesByRowId = useMemo(
    () => new Map(existingMatchRows.map((entry) => [entry.row.id, entry])),
    [existingMatchRows],
  );
  const existingDuplicateCounts = useMemo(
    () =>
      new Map(
        existingMatchRows.map(({ match, row }) => [
          row.id,
          match.listings.length,
        ]),
      ),
    [existingMatchRows],
  );
  const includedRows = listingRows.filter(
    (row) => row.outputState === "included",
  );
  const reviewRowIds = new Set(controller.reviewRows.map((row) => row.id));
  const hasIssue = (row: CatalogImportRow) =>
    row.cultivarReferenceIdWarning !== null ||
    row.duplicateOfSourceRow !== null ||
    row.priceWarning !== null;
  const exactExistingRows = existingMatchRows.filter(
    ({ match, row }) =>
      match.kind === "exact" &&
      row.outputState === "included" &&
      row.existingListingDecision == null,
  );
  const possibleExistingAllRows = existingMatchRows.filter(
    ({ match }) => match.kind === "possible",
  );
  const possibleExistingRows = existingMatchRows.filter(
    ({ match, row }) =>
      match.kind === "possible" &&
      row.outputState === "included" &&
      row.existingListingDecision == null,
  );
  const completedExistingCount =
    possibleExistingAllRows.length - possibleExistingRows.length;
  const useExistingRows = existingMatchRows.filter(
    ({ row }) =>
      row.outputState === "included" &&
      row.existingListingDecision === "use-existing",
  );
  const readyRows = includedRows.filter((row) => {
    const existing = existingMatchesByRowId.get(row.id);
    if (existing) {
      if (row.existingListingDecision === "use-existing") return false;
      if (row.existingListingDecision !== "create") return false;
    }
    return !reviewRowIds.has(row.id) && !hasIssue(row);
  });
  const excludedRows = listingRows.filter(
    (row) => row.outputState === "removed",
  );
  const blockingCount =
    controller.reviewRows.length +
    controller.remainingIssueCount +
    possibleExistingRows.length;

  const buildCatalog = async () => {
    const built = await controller.buildCatalogPreview();
    if (built) setStep("ready");
  };

  const openReviewRow = (row: CatalogImportRow) => {
    controller.openReviewRow(row);
    setStep("review");
  };

  const startOver = () => {
    controller.resetImporter();
    setStep("start");
    setMatchSheetRow(null);
    setImportProgress(null);
    setImportError(null);
    setCompletion(null);
  };

  const runImport = async () => {
    setImportError(null);
    await controller.flushDraft();

    if (blockingCount > 0) {
      setImportError("Finish the remaining review steps before importing.");
      return;
    }

    const rows = readyRows.map((row) => ({
      ...getPreparedListing(row),
      allowExistingDuplicate: row.existingListingDecision === "create",
      importKey: `${controller.projectId}:${row.id}`,
    }));
    const skippedCount = exactExistingRows.length + useExistingRows.length;

    if (rows.length === 0) {
      if (skippedCount === 0) {
        setImportError("Include at least one listing before importing.");
        return;
      }
      await clearCatalogImporterDraft();
      setCompletion({ createdCount: 0, existingCount: 0, skippedCount });
      setStep("complete");
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
        skippedCount: skippedCount + serverSkippedCount,
      });
      setStep("complete");
    } catch (error) {
      setImportError(getImportErrorMessage(error));
    } finally {
      setImportProgress(null);
    }
  };

  if (!controller.matchedRows) {
    return (
      <div className="space-y-6">
        <nav className="flex gap-5 border-b" aria-label="Catalog import steps">
          <StepButton
            active={step === "start"}
            onClick={() => setStep("start")}
          >
            Start
          </StepButton>
          <StepButton
            active={step === "prepare"}
            disabled={!controller.parsedSpreadsheet}
            onClick={() => setStep("prepare")}
          >
            Prepare
          </StepButton>
        </nav>

        {step === "start" ? (
          <div className="space-y-5">
            <CatalogImporterUpload
              controller={controller}
              onClear={() => setStep("start")}
              onSourceReady={() => setStep("prepare")}
            />
          </div>
        ) : null}

        {step === "prepare" && controller.selectedSheet ? (
          <div className="space-y-6">
            <CatalogImporterUpload
              controller={controller}
              onClear={() => setStep("start")}
            />
            {controller.parsedSpreadsheet?.source === "manual" ? (
              <div className="space-y-4">
                <CatalogImporterManualTable controller={controller} />
                <Button
                  type="button"
                  disabled={controller.processingStage !== null}
                  onClick={() => void buildCatalog()}
                >
                  Prepare listings
                </Button>
              </div>
            ) : (
              <CatalogImporterMapping
                controller={controller}
                onSubmit={() => void buildCatalog()}
              />
            )}
          </div>
        ) : null}

        {controller.fileError || controller.matchError ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Import preparation did not finish</AlertTitle>
            <AlertDescription>
              {controller.fileError ?? controller.matchError}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  if (existingListings.isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex gap-5 border-b" aria-label="Catalog import steps">
          <StepButton active onClick={() => undefined}>
            Ready
          </StepButton>
          <StepButton active={false} disabled onClick={() => undefined}>
            Import
          </StepButton>
        </nav>
        <p className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Spinner />
          Checking your existing catalog…
        </p>
      </div>
    );
  }

  if (existingListings.isError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <DashboardImportStartOver onStartOver={startOver} />
        </div>
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

  const readyRowIds = new Set(readyRows.map((row) => row.id));
  const excludedRowIds = new Set(excludedRows.map((row) => row.id));
  const nextAfterReady: DashboardImportStep =
    controller.reviewRows.length > 0
      ? "review"
      : controller.remainingIssueCount > 0
        ? "issues"
        : possibleExistingRows.length > 0
          ? "existing"
          : "confirm";
  const readySummary = [
    exactExistingRows.length > 0
      ? `${exactExistingRows.length.toLocaleString()} ${exactExistingRows.length === 1 ? "listing already exists" : "listings already exist"}`
      : null,
    controller.reviewRows.length > 0
      ? `${controller.reviewRows.length.toLocaleString()} ${controller.reviewRows.length === 1 ? "listing needs" : "listings need"} cultivar review`
      : null,
    controller.remainingIssueCount > 0
      ? `${controller.remainingIssueCount.toLocaleString()} ${controller.remainingIssueCount === 1 ? "listing has" : "listings have"} data issues`
      : null,
    possibleExistingRows.length > 0
      ? `${possibleExistingRows.length.toLocaleString()} ${possibleExistingRows.length === 1 ? "listing needs" : "listings need"} an existing-listing decision`
      : null,
  ].filter((item): item is string => item !== null);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DashboardImportStartOver
          disabled={importProgress !== null}
          onStartOver={startOver}
        />
      </div>

      <nav
        className="flex gap-5 overflow-x-auto border-b"
        aria-label="Catalog import steps"
      >
        <StepButton active={step === "ready"} onClick={() => setStep("ready")}>
          Ready {readyRows.length}
        </StepButton>
        {controller.reviewProgressTotal > 0 ? (
          <StepButton
            active={step === "review"}
            onClick={() => setStep("review")}
          >
            Review {controller.completedReviewCount}/
            {controller.reviewProgressTotal}
          </StepButton>
        ) : null}
        {controller.issueProgressTotal > 0 ? (
          <StepButton
            active={step === "issues"}
            onClick={() => setStep("issues")}
          >
            Issues {controller.completedIssueCount}/
            {controller.issueProgressTotal}
          </StepButton>
        ) : null}
        {possibleExistingAllRows.length > 0 ? (
          <StepButton
            active={step === "existing"}
            onClick={() => setStep("existing")}
          >
            Existing {completedExistingCount}/{possibleExistingAllRows.length}
          </StepButton>
        ) : null}
        <StepButton
          active={step === "confirm"}
          onClick={() => setStep("confirm")}
        >
          Import
        </StepButton>
      </nav>

      {step === "ready" ? (
        <section className="space-y-6" aria-labelledby="import-summary-heading">
          <div>
            <h2
              id="import-summary-heading"
              className="text-3xl font-semibold tracking-tight"
            >
              {readyRows.length === 0
                ? "No listings are ready to create"
                : `${readyRows.length.toLocaleString()} listings are ready to create`}
            </h2>
            {readyRows.length > 0 && readySummary.length > 0 ? (
              <p className="text-muted-foreground mt-2 max-w-3xl">
                {readySummary.join(" · ")}
              </p>
            ) : null}
          </div>

          {readyRows.length > 0 ? (
            <DashboardImportTable
              controller={controller}
              existingDuplicateCounts={existingDuplicateCounts}
              onReviewRow={openReviewRow}
              rowIds={readyRowIds}
              view="all"
            />
          ) : blockingCount > 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No new listings are ready yet</EmptyTitle>
                <EmptyDescription>
                  Complete the remaining review steps to prepare listings.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          <DashboardImportAlreadyExistingRows
            controller={controller}
            rows={exactExistingRows}
          />

          {excludedRows.length > 0 ? (
            <details className="border-y py-3">
              <summary className="cursor-pointer text-sm font-medium">
                {excludedRows.length.toLocaleString()} excluded row
                {excludedRows.length === 1 ? "" : "s"}
              </summary>
              <div className="mt-3">
                <DashboardImportTable
                  controller={controller}
                  existingDuplicateCounts={existingDuplicateCounts}
                  onReviewRow={openReviewRow}
                  rowIds={excludedRowIds}
                  view="all"
                />
              </div>
            </details>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" onClick={() => setStep(nextAfterReady)}>
              {nextAfterReady === "review"
                ? "Continue to cultivar review"
                : nextAfterReady === "issues"
                  ? "Continue to data issues"
                  : nextAfterReady === "existing"
                    ? "Continue to existing listings"
                    : readyRows.length === 0
                      ? "Continue"
                      : "Continue to import"}
              <ArrowRight />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "review" ? (
        <div className="space-y-6">
          {controller.activeReviewRow ? (
            <CatalogImporterReviewQuiz
              controller={controller}
              destination="import"
              onFindDifferentCultivar={(row) => setMatchSheetRow(row)}
            />
          ) : (
            <div className="border-y py-5">
              <p className="font-medium">Cultivar review complete</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {controller.reviewProgressTotal.toLocaleString()} names reviewed
              </p>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              disabled={controller.reviewRows.length > 0}
              onClick={() =>
                setStep(
                  controller.remainingIssueCount > 0
                    ? "issues"
                    : possibleExistingRows.length > 0
                      ? "existing"
                      : "confirm",
                )
              }
            >
              {controller.remainingIssueCount > 0
                ? "Continue to issues"
                : possibleExistingRows.length > 0
                  ? "Continue to existing listings"
                  : "Continue to import"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      ) : null}

      {step === "issues" ? (
        <div className="space-y-6">
          {controller.remainingIssueCount > 0 ? (
            <CatalogImporterIssues
              controller={controller}
              destination="import"
            />
          ) : (
            <div className="border-y py-5">
              <p className="font-medium">Spreadsheet review complete</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {controller.issueProgressTotal.toLocaleString()} items reviewed
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={controller.remainingIssueCount > 0}
              onClick={() =>
                setStep(
                  possibleExistingRows.length > 0 ? "existing" : "confirm",
                )
              }
            >
              {possibleExistingRows.length > 0
                ? "Continue to existing listings"
                : "Continue to import"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      ) : null}

      {step === "existing" ? (
        <div className="space-y-6">
          <DashboardImportExistingListingReview
            completedCount={completedExistingCount}
            controller={controller}
            rows={possibleExistingRows}
            totalCount={possibleExistingAllRows.length}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={possibleExistingRows.length > 0}
              onClick={() => setStep("confirm")}
            >
              Continue to import
              <ArrowRight />
            </Button>
          </div>
        </div>
      ) : null}

      {step === "confirm" ? (
        readyRows.length === 0 &&
        exactExistingRows.length + useExistingRows.length > 0 ? (
          <section className="mx-auto max-w-3xl py-12 text-center">
            <CheckCircle2 className="text-primary mx-auto size-10" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Everything in this spreadsheet is already in your catalog
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/dashboard/listings">View listings</Link>
              </Button>
              <Button type="button" variant="outline" onClick={startOver}>
                Start another import
              </Button>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-3xl space-y-6 py-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Create {readyRows.length.toLocaleString()} listings?
              </h2>
              <p className="text-muted-foreground mt-2">
                This creates new listings only. Existing listings will not be
                changed, and excluded rows will not be imported.
              </p>
            </div>

            <dl className="grid gap-4 border-y py-5 sm:grid-cols-2">
              {readyRows.length > 0 ? (
                <div>
                  <dt className="text-muted-foreground text-sm">
                    Ready to create
                  </dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {readyRows.length.toLocaleString()}
                  </dd>
                </div>
              ) : null}
              {exactExistingRows.length + useExistingRows.length > 0 ? (
                <div>
                  <dt className="text-muted-foreground text-sm">
                    Using existing listings
                  </dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {(
                      exactExistingRows.length + useExistingRows.length
                    ).toLocaleString()}
                  </dd>
                </div>
              ) : null}
              {excludedRows.length > 0 ? (
                <div>
                  <dt className="text-muted-foreground text-sm">
                    Excluded rows
                  </dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {excludedRows.length.toLocaleString()}
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

            {blockingCount > 0 ? (
              <Alert>
                <AlertCircle />
                <AlertTitle>Finish reviewing this import</AlertTitle>
                <AlertDescription>
                  {blockingCount.toLocaleString()} review decision
                  {blockingCount === 1 ? " remains" : "s remain"} before
                  listings can be created.
                </AlertDescription>
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
                onClick={() => setStep("ready")}
              >
                Back to ready listings
              </Button>
              <Button
                type="button"
                disabled={
                  blockingCount > 0 ||
                  (readyRows.length === 0 &&
                    exactExistingRows.length + useExistingRows.length === 0) ||
                  importProgress !== null
                }
                onClick={() => void runImport()}
              >
                {importError
                  ? "Retry creating listings"
                  : `Create ${readyRows.length.toLocaleString()} ${readyRows.length === 1 ? "listing" : "listings"}`}
              </Button>
            </div>
          </section>
        )
      ) : null}

      {step === "complete" && completion ? (
        <section className="mx-auto max-w-3xl py-12 text-center">
          <CheckCircle2 className="text-primary mx-auto size-10" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Your catalog has been imported
          </h2>
          <p className="text-muted-foreground mt-3">
            {completion.createdCount.toLocaleString()} listings were created.
            {completion.skippedCount > 0
              ? ` ${completion.skippedCount.toLocaleString()} listings already in your catalog were skipped.`
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

      <CatalogImporterMatchSheet
        controller={controller}
        open={matchSheetRow !== null}
        row={matchSheetRow}
        onOpenChange={(open) => !open && setMatchSheetRow(null)}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {controller.liveAnnouncement}
      </div>
    </div>
  );
}
