"use client";

import { useCallback, useRef, useState } from "react";
import type { ColumnFiltersState, OnChangeFn } from "@tanstack/react-table";
import { CircleAlert, Download, Undo2 } from "lucide-react";
import { SellerIntentLink } from "@/components/seller-intent-link";
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
import { Spinner } from "@/components/ui/spinner";
import {
  CatalogImporterAnalysis,
  type CatalogImporterInsightFilter,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-analysis";
import { CatalogImporterIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-issues";
import {
  CatalogImporterCatalogPreview,
  getCatalogPreviewRowId,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-catalog-preview";
import { CatalogImporterMatchSheet } from "@/app/(public)/catalog-importer/_components/catalog-importer-match-sheet";
import { CatalogImporterOverview } from "@/app/(public)/catalog-importer/_components/catalog-importer-overview";
import { CatalogImporterReviewQuiz } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-quiz";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import type { CatalogImportRow } from "@/lib/catalog-importer";

interface CatalogImporterResultsProps {
  controller: CatalogImporterWorkbenchController;
}

function CatalogImporterMembershipPrompt({
  ctaId,
  description,
  heading,
}: {
  ctaId: string;
  description: string;
  heading: string;
}) {
  const trackPromptImpression = useCallback(
    (node: HTMLElement | null) => {
      if (!node) {
        return;
      }

      const impressionKey = `catalog-importer-membership-prompt-viewed:${ctaId}`;
      try {
        if (globalThis.sessionStorage?.getItem(impressionKey) === "1") {
          return;
        }
        globalThis.sessionStorage?.setItem(impressionKey, "1");
      } catch {
        // Analytics still records the visible prompt when storage is unavailable.
      }
      capturePosthogEvent("catalog_import_membership_prompt_viewed", {
        cta_id: ctaId,
      });
    },
    [ctaId],
  );

  return (
    <section
      aria-labelledby={`${ctaId}-heading`}
      className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between"
      ref={trackPromptImpression}
    >
      <div className="max-w-2xl">
        <h2
          id={`${ctaId}-heading`}
          className="text-xl font-semibold tracking-tight"
        >
          {heading}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <SellerIntentLink
          ctaId={ctaId}
          ctaLabel="Explore Pro membership"
          entrySurface="catalog_importer_preview"
          sourcePageType="catalog_importer"
          sourcePath="/catalog-importer"
        >
          Explore Pro membership
        </SellerIntentLink>
      </Button>
    </section>
  );
}

function getDownloadLabel(controller: CatalogImporterWorkbenchController) {
  return controller.reviewRows.length > 0 || controller.remainingIssueCount > 0
    ? "Download current workbook"
    : "Download prepared workbook";
}

function CatalogImporterActions({ controller }: CatalogImporterResultsProps) {
  return (
    <nav
      aria-label="Catalog preparation actions"
      className="bg-background/95 sticky top-0 z-30 border-y py-3 backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm tabular-nums">
        <a
          href="#catalog-importer-preview"
          className="font-medium hover:underline"
        >
          Catalog preview
        </a>
        {controller.reviewRows.length > 0 ? (
          <a
            href="#catalog-importer-review-quiz"
            className="text-primary font-semibold hover:underline"
          >
            Review {controller.completedReviewCount.toLocaleString()}/
            {controller.reviewProgressTotal.toLocaleString()}
          </a>
        ) : controller.reviewProgressTotal > 0 ? (
          <span className="text-muted-foreground">
            Review {controller.completedReviewCount.toLocaleString()}/
            {controller.reviewProgressTotal.toLocaleString()}
          </span>
        ) : null}
        {controller.remainingIssueCount > 0 ? (
          <a
            href="#catalog-importer-issues"
            className="text-primary font-semibold hover:underline"
          >
            Issues {controller.completedIssueCount.toLocaleString()}/
            {controller.issueProgressTotal.toLocaleString()}
          </a>
        ) : controller.issueProgressTotal > 0 ? (
          <span className="text-muted-foreground">
            Issues {controller.completedIssueCount.toLocaleString()}/
            {controller.issueProgressTotal.toLocaleString()}
          </span>
        ) : null}
        <a
          href="#catalog-importer-download"
          className="font-medium hover:underline"
        >
          Download
        </a>
      </div>
    </nav>
  );
}

function CatalogImporterUnmatchedRows({
  controller,
}: CatalogImporterResultsProps) {
  const rows = controller.includedRows.filter(
    (row) => row.linkState === "intentionally-unmatched",
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      id="catalog-importer-unmatched"
      role="region"
      aria-labelledby="catalog-importer-unmatched-heading"
      className="space-y-3"
    >
      <h2 id="catalog-importer-unmatched-heading" className="font-semibold">
        Left unmatched ({rows.length.toLocaleString()})
      </h2>
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-4 rounded-md py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.sourceTitle}</p>
              <p className="text-muted-foreground text-xs">
                Source row {row.sourceRow}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              aria-label={`Review ${row.sourceTitle} again`}
              onClick={() => controller.restoreUnmatchedRow(row.id)}
            >
              Review again
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CatalogImporterResults({
  controller,
  showMembershipPrompts,
}: CatalogImporterResultsProps & { showMembershipPrompts: boolean }) {
  const [matchEditorRowId, setMatchEditorRowId] = useState<string | null>(null);
  const [downloadConfirmationOpen, setDownloadConfirmationOpen] =
    useState(false);
  const [previewColumnFilters, setPreviewColumnFilters] =
    useState<ColumnFiltersState>([]);
  const previewFilterInteractionTracked = useRef(false);
  const matchEditorRow =
    controller.includedRows.find((row) => row.id === matchEditorRowId) ?? null;
  const readyToDownload =
    controller.reviewRows.length === 0 && controller.remainingIssueCount === 0;
  const downloadLabel = getDownloadLabel(controller);
  const handleOpenReview = useCallback((row: CatalogImportRow) => {
    setMatchEditorRowId(row.id);
  }, []);
  const handleApplyInsightFilter = useCallback(
    (insightFilter: CatalogImporterInsightFilter) => {
      capturePosthogEvent("catalog_import_preview_interacted", {
        filter_type: insightFilter.id,
        interaction_type: "insight",
      });
      setPreviewColumnFilters((currentFilters) => [
        ...currentFilters.filter(
          (currentFilter) => currentFilter.id !== insightFilter.id,
        ),
        insightFilter,
      ]);
    },
    [],
  );
  const handlePreviewColumnFiltersChange = useCallback<
    OnChangeFn<ColumnFiltersState>
  >((nextFilters) => {
    if (!previewFilterInteractionTracked.current) {
      previewFilterInteractionTracked.current = true;
      capturePosthogEvent("catalog_import_preview_interacted", {
        interaction_type: "search_or_filter",
      });
    }
    setPreviewColumnFilters(nextFilters);
  }, []);
  const requestDownload = () => {
    if (
      controller.reviewRows.length > 0 ||
      controller.remainingIssueCount > 0
    ) {
      setDownloadConfirmationOpen(true);
      return;
    }

    void controller.downloadResults();
  };
  return (
    <div className="min-w-0 space-y-8">
      <CatalogImporterOverview controller={controller} />
      <CatalogImporterActions controller={controller} />

      <CatalogImporterAnalysis
        rows={controller.includedRows}
        onApplyFilter={handleApplyInsightFilter}
      />

      <CatalogImporterCatalogPreview
        columnFilters={previewColumnFilters}
        controller={controller}
        onColumnFiltersChange={handlePreviewColumnFiltersChange}
        onOpenReview={handleOpenReview}
      />

      {showMembershipPrompts ? (
        <CatalogImporterMembershipPrompt
          ctaId="catalog-importer-preview-membership"
          heading="Imagine this as your public catalog"
          description="Pro adds a hosted catalog, seller dashboard, and discovery. Your prepared workbook stays free; it is not imported automatically."
        />
      ) : null}

      {controller.lastLinkAction ? (
        <div
          role="status"
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium">
            {controller.lastLinkAction.displayName}{" "}
            {controller.lastLinkAction.kind === "excluded"
              ? "was excluded from the prepared workbook."
              : controller.lastLinkAction.kind === "left-unmatched"
                ? "will remain unmatched in the prepared workbook."
                : controller.lastLinkAction.kind === "added"
                  ? "was added to your preview."
                  : "is now linked in your preview."}
          </p>
          <div className="flex items-center gap-1">
            {controller.lastLinkAction.kind !== "left-unmatched" &&
            controller.lastLinkAction.kind !== "excluded" ? (
              <Button asChild variant="link" size="sm">
                <a
                  href={`#${getCatalogPreviewRowId(controller.lastLinkAction.rowId)}`}
                >
                  View in preview
                </a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Undo identity decision"
              onClick={controller.undoLastLinkAction}
            >
              <Undo2 aria-hidden="true" className="size-4" />
              Undo
            </Button>
          </div>
        </div>
      ) : null}

      {controller.lastIssueAction ? (
        <div
          role="status"
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium">
            {controller.lastIssueAction.message}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Undo spreadsheet issue change"
            onClick={controller.undoLastIssueAction}
          >
            <Undo2 aria-hidden="true" className="size-4" />
            Undo
          </Button>
        </div>
      ) : null}

      <CatalogImporterUnmatchedRows controller={controller} />

      {controller.reviewRows.length > 0 ? (
        <CatalogImporterReviewQuiz
          controller={controller}
          onFindDifferentCultivar={handleOpenReview}
        />
      ) : null}

      {controller.issueCount > 0 || controller.counts.warningCount > 0 ? (
        <CatalogImporterIssues controller={controller} />
      ) : null}

      {controller.downloadError ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" />
          <AlertTitle>Spreadsheet download did not finish</AlertTitle>
          <AlertDescription>
            {controller.downloadError} Your workbook and matching progress are
            still here. Try the download again.
          </AlertDescription>
        </Alert>
      ) : null}

      <section
        id="catalog-importer-download"
        aria-labelledby="catalog-importer-download-heading"
        className="!scroll-mt-16"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <h2
              id="catalog-importer-download-heading"
              className="font-semibold"
            >
              {readyToDownload
                ? "Your prepared workbook is ready"
                : "Download your current workbook"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {readyToDownload ? (
                <>
                  Includes your approved changes and Daylily Catalog identity
                  fields.
                </>
              ) : (
                <>
                  {controller.reviewRows.length.toLocaleString()} potential{" "}
                  {controller.reviewRows.length === 1 ? "match" : "matches"} and{" "}
                  {controller.remainingIssueCount.toLocaleString()} spreadsheet{" "}
                  {controller.remainingIssueCount === 1 ? "item" : "items"}{" "}
                  remain.
                </>
              )}
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0"
            disabled={controller.downloadingResults}
            onClick={requestDownload}
          >
            {controller.downloadingResults ? (
              <Spinner />
            ) : (
              <Download className="size-4" />
            )}
            {downloadLabel}
          </Button>
        </div>

        {controller.downloadSummary ? (
          <details className="mt-4 max-w-3xl">
            <summary className="cursor-pointer text-sm font-medium">
              File details
            </summary>
            <ul className="text-muted-foreground mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <li>
                Retain{" "}
                {controller.downloadSummary.fileType === "csv"
                  ? `${controller.downloadSummary.retainedSourceRowCount.toLocaleString()} source rows in one CSV table`
                  : `${controller.downloadSummary.retainedWorksheetCount.toLocaleString()} ${controller.downloadSummary.retainedWorksheetCount === 1 ? "worksheet" : "worksheets"} and ${controller.downloadSummary.retainedSourceRowCount.toLocaleString()} source rows`}
              </li>
              <li>
                Include{" "}
                {controller.downloadSummary.appliedCorrectionCount.toLocaleString()}{" "}
                seller-approved{" "}
                {controller.downloadSummary.appliedCorrectionCount === 1
                  ? "correction"
                  : "corrections"}
              </li>
              <li>
                Add Daylily Catalog identity to{" "}
                {controller.downloadSummary.linkedIdentityCount.toLocaleString()}{" "}
                linked{" "}
                {controller.downloadSummary.linkedIdentityCount === 1
                  ? "listing"
                  : "listings"}
              </li>
              <li>
                Keep{" "}
                {controller.downloadSummary.intentionallyUnmatchedCount.toLocaleString()}{" "}
                intentionally unmatched{" "}
                {controller.downloadSummary.intentionallyUnmatchedCount === 1
                  ? "listing"
                  : "listings"}
              </li>
              <li>
                Remove{" "}
                {controller.downloadSummary.removedRowCount.toLocaleString()}{" "}
                source{" "}
                {controller.downloadSummary.removedRowCount === 1
                  ? "row"
                  : "rows"}
              </li>
              <li>
                Leave{" "}
                {controller.downloadSummary.unresolvedCultivarCount.toLocaleString()}{" "}
                cultivar{" "}
                {controller.downloadSummary.unresolvedCultivarCount === 1
                  ? "decision"
                  : "decisions"}
                ,{" "}
                {controller.downloadSummary.unresolvedValueCount.toLocaleString()}{" "}
                required{" "}
                {controller.downloadSummary.unresolvedValueCount === 1
                  ? "value"
                  : "values"}
                , and{" "}
                {controller.downloadSummary.unresolvedWarningCount.toLocaleString()}{" "}
                {controller.downloadSummary.unresolvedWarningCount === 1
                  ? "warning"
                  : "warnings"}{" "}
                unresolved
              </li>
            </ul>
            <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
              {controller.downloadSummary.fileType === "csv"
                ? "CSV uploads download as one CSV table. "
                : "XLSX uploads retain every worksheet as a value-only workbook. "}
              Mapped headers are standardized to Name, Price, Description,
              Private Note, and Image URL. Reference photos, awards, and
              cultivar attributes are not copied. Formulas, formatting, merged
              cells, drawings, comments, macros, validation, and hidden state
              are not preserved. Nothing is published or imported.
            </p>
          </details>
        ) : null}
      </section>

      <AlertDialog
        open={downloadConfirmationOpen}
        onOpenChange={setDownloadConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Download before review is complete?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have {controller.reviewRows.length.toLocaleString()} potential{" "}
              {controller.reviewRows.length === 1 ? "match" : "matches"} to
              review. You have {controller.remainingIssueCount.toLocaleString()}{" "}
              spreadsheet{" "}
              {controller.remainingIssueCount === 1 ? "item" : "items"} to
              review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDownloadConfirmationOpen(false);
                void controller.downloadResults();
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
