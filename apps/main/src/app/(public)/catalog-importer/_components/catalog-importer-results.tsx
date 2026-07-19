"use client";

import { useCallback, useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { CircleAlert, Download, Undo2 } from "lucide-react";
import { SellerIntentLink } from "@/components/seller-intent-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import type { CatalogImportRow } from "@/lib/catalog-importer";

interface CatalogImporterResultsProps {
  controller: CatalogImporterWorkbenchController;
}

function CatalogImporterWorkspaceNavigation({
  controller,
}: CatalogImporterResultsProps) {
  const reviewCount = controller.reviewRows.length;
  const issueCount = controller.issueCount;
  const workRemaining = reviewCount + issueCount;
  const downloadLabel =
    workRemaining > 0
      ? "Download current workbook"
      : "Download prepared workbook";
  const nextAction =
    reviewCount > 0
      ? {
          href: "#catalog-importer-review-quiz",
          label: `Review ${reviewCount.toLocaleString()}`,
        }
      : controller.counts.savedIdIssueCount > 0
        ? {
            href: "#catalog-importer-saved-id-issues-heading",
            label: `Review ${controller.counts.savedIdIssueCount.toLocaleString()}`,
          }
        : controller.counts.requiredDataDecisionCount > 0
          ? {
              href: "#catalog-importer-price-issues-heading",
              label: `Fix ${controller.counts.requiredDataDecisionCount.toLocaleString()}`,
            }
          : controller.counts.duplicateGroupCount > 0
            ? {
                href: "#duplicate-issues-heading",
                label: `Review ${controller.counts.duplicateGroupCount.toLocaleString()}`,
              }
            : controller.counts.imageIssueCount > 0
              ? {
                  href: "#catalog-importer-image-issues-heading",
                  label: `Review ${controller.counts.imageIssueCount.toLocaleString()}`,
                }
              : null;

  const download = () => {
    void controller.downloadResults();
  };

  return (
    <>
      <nav
        aria-label="Catalog preparation workspace"
        className="bg-background/95 sticky top-2 z-30 hidden items-center justify-between gap-4 border-y py-2 backdrop-blur md:flex"
      >
        <div className="flex min-w-0 items-center gap-4 overflow-x-auto text-sm">
          <a
            href="#catalog-importer-preview"
            className="hover:text-primary shrink-0 font-medium"
          >
            Catalog preview
          </a>
          <a
            href="#catalog-importer-insights"
            className="hover:text-primary shrink-0 font-medium"
          >
            Insights
          </a>
          {reviewCount > 0 ? (
            <a
              href="#catalog-importer-review-quiz"
              className="hover:text-primary shrink-0 font-medium"
            >
              Review names ({reviewCount.toLocaleString()})
            </a>
          ) : null}
          {issueCount > 0 ? (
            <a
              href="#catalog-importer-issues"
              className="hover:text-primary shrink-0 font-medium"
            >
              Fix data ({issueCount.toLocaleString()})
            </a>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={controller.downloadingResults}
          onClick={download}
        >
          {controller.downloadingResults ? (
            <Spinner />
          ) : (
            <Download className="size-4" />
          )}
          {downloadLabel}
        </Button>
      </nav>

      <nav
        aria-label="Catalog preparation actions"
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(0_0_0/0.08)] backdrop-blur md:hidden"
      >
        {nextAction ? (
          <Button asChild variant="outline" className="min-w-0 flex-1">
            <a href={nextAction.href}>
              {nextAction.label}
              <span className="sr-only">
                {workRemaining.toLocaleString()} total items remaining
              </span>
            </a>
          </Button>
        ) : (
          <span className="text-sm font-medium">Preparation complete</span>
        )}
        <Button
          type="button"
          className="shrink-0"
          disabled={controller.downloadingResults}
          aria-label={downloadLabel}
          onClick={download}
        >
          {controller.downloadingResults ? (
            <Spinner />
          ) : (
            <Download className="size-4" />
          )}
          Download
        </Button>
      </nav>
    </>
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
      className="border-t pt-8"
    >
      <h2 id="catalog-importer-unmatched-heading" className="font-semibold">
        Listings left unmatched
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        These rows stay in the prepared workbook without Daylily Catalog
        identity fields.
      </p>
      <div className="mt-4 divide-y border-y">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-4 py-3"
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
}: CatalogImporterResultsProps) {
  const [matchEditorRowId, setMatchEditorRowId] = useState<string | null>(null);
  const [previewColumnFilters, setPreviewColumnFilters] =
    useState<ColumnFiltersState>([]);
  const matchEditorRow =
    controller.includedRows.find((row) => row.id === matchEditorRowId) ?? null;
  const readyToDownload =
    controller.reviewRows.length === 0 && controller.issueCount === 0;
  const handleOpenReview = useCallback((row: CatalogImportRow) => {
    setMatchEditorRowId(row.id);
  }, []);
  const handleApplyInsightFilter = useCallback(
    (insightFilter: CatalogImporterInsightFilter) => {
      setPreviewColumnFilters((currentFilters) => [
        ...currentFilters.filter(
          (currentFilter) => currentFilter.id !== insightFilter.id,
        ),
        insightFilter,
      ]);
    },
    [],
  );
  const hasPreparationWork =
    controller.reviewRows.length > 0 || controller.issueCount > 0;
  const nextPreparationAction =
    controller.reviewRows.length > 0
      ? {
          href: "#catalog-importer-review-quiz",
          label: "Review next name",
        }
      : {
          href: "#catalog-importer-issues",
          label: "Fix data",
        };

  return (
    <div className="min-w-0 space-y-10 pb-24 md:pb-0">
      <CatalogImporterOverview controller={controller} />

      <CatalogImporterWorkspaceNavigation controller={controller} />

      <CatalogImporterCatalogPreview
        columnFilters={previewColumnFilters}
        controller={controller}
        onColumnFiltersChange={setPreviewColumnFilters}
        onOpenReview={handleOpenReview}
      />

      <CatalogImporterAnalysis
        rows={controller.includedRows}
        onApplyFilter={handleApplyInsightFilter}
      />

      {hasPreparationWork ? (
        <section
          id="catalog-importer-preparation"
          aria-labelledby="catalog-importer-preparation-heading"
          className="border-t pt-10"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2
                id="catalog-importer-preparation-heading"
                className="text-xl font-semibold tracking-tight"
              >
                Finish preparing your workbook
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                Most of your collection is ready.{" "}
                {controller.reviewRows.length > 0
                  ? `${controller.reviewRows.length.toLocaleString()} ${controller.reviewRows.length === 1 ? "name needs" : "names need"} your cultivar decision. `
                  : ""}
                {controller.issueCount > 0
                  ? `${controller.issueCount.toLocaleString()} ${controller.issueCount === 1 ? "data item needs" : "data items need"} review.`
                  : ""}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <a href={nextPreparationAction.href}>
                {nextPreparationAction.label}
              </a>
            </Button>
          </div>
        </section>
      ) : null}

      {controller.lastLinkAction ? (
        <div
          role="status"
          className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium">
            {controller.lastLinkAction.displayName}{" "}
            {controller.lastLinkAction.kind === "left-unmatched"
              ? "will remain unmatched in the prepared workbook."
              : controller.lastLinkAction.kind === "added"
                ? "was added to your preview."
                : "is now linked in your preview."}
          </p>
          <div className="flex items-center gap-1">
            {controller.lastLinkAction.kind !== "left-unmatched" ? (
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
          className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between"
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
        <CatalogImporterReviewQuiz controller={controller} />
      ) : null}

      {controller.issueCount > 0 ? (
        <CatalogImporterIssues controller={controller} />
      ) : null}

      {controller.downloadError ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" />
          <AlertTitle>Spreadsheet download did not finish</AlertTitle>
          <AlertDescription>{controller.downloadError}</AlertDescription>
        </Alert>
      ) : null}

      <section
        id="catalog-importer-download"
        aria-labelledby="catalog-importer-download-heading"
        className="flex !scroll-mt-16 flex-col gap-5 border-t pt-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 id="catalog-importer-download-heading" className="font-semibold">
            {readyToDownload
              ? "Your prepared spreadsheet is ready"
              : "Download your progress"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Downloads a cleaned copy with your sheets and seller-owned columns.
            Linked names, approved fixes, and Daylily Catalog identity columns
            are included. XLSX formatting and formulas are not copied.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0"
          disabled={controller.downloadingResults}
          onClick={() => void controller.downloadResults()}
        >
          {controller.downloadingResults ? (
            <Spinner />
          ) : (
            <Download className="size-4" />
          )}
          Download prepared spreadsheet
        </Button>
      </section>

      <section
        aria-labelledby="catalog-importer-membership-heading"
        className="flex flex-col gap-5 border-t pt-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="max-w-2xl">
          <h2
            id="catalog-importer-membership-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Imagine this as your public catalog
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Daylily Catalog Pro includes a hosted seller catalog, seller
            dashboard, and discovery features. Your prepared workbook remains
            available to download here.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <SellerIntentLink
            ctaId="catalog-importer-membership"
            ctaLabel="Explore Pro membership"
            entrySurface="catalog_importer_preview"
            sourcePageType="catalog_importer"
            sourcePath="/catalog-importer"
          >
            Explore Pro membership
          </SellerIntentLink>
        </Button>
      </section>

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
