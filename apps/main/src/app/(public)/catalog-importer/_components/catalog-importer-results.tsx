"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { ColumnFiltersState, OnChangeFn } from "@tanstack/react-table";
import { ArrowRight, CheckCircle2, CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CatalogImporterViewerResolution } from "@/lib/catalog-importer-membership";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";
import {
  CatalogImporterAnalysis,
  type CatalogImporterInsightFilter,
  type AnalysisView,
  isCatalogImporterAnalysisView,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-analysis";
import { CatalogImporterIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-issues";
import {
  CATALOG_IMPORTER_PREVIEW_FILTER_IDS,
  CatalogImporterCatalogPreview,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-catalog-preview";
import { CatalogImporterDownloadOptions } from "@/app/(public)/catalog-importer/_components/catalog-importer-download-options";
import { CatalogImporterMatchSheet } from "@/app/(public)/catalog-importer/_components/catalog-importer-match-sheet";
import { CatalogImporterOverview } from "@/app/(public)/catalog-importer/_components/catalog-importer-overview";
import { CatalogImporterPublishActions } from "@/app/(public)/catalog-importer/_components/catalog-importer-publish-actions";
import { CatalogImporterReviewQuiz } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-quiz";
import { CatalogImporterReviewedIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-reviewed-issues";
import { CatalogImporterReviewedRows } from "@/app/(public)/catalog-importer/_components/catalog-importer-reviewed-rows";
import type { CatalogImporterStep } from "@/app/(public)/catalog-importer/_components/catalog-importer-step-nav";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import {
  getCatalogImportRowDisposition,
  type CatalogImportRow,
} from "@/lib/catalog-importer";
import { getPublicCatalogSearchFilterDefinition } from "@/components/public-catalog-search/public-catalog-search-registry";
import { cn } from "@/lib/utils";

const CATALOG_IMPORTER_URL_CHANGE_EVENT = "catalog-importer-url-change";

function subscribeToCatalogImporterUrl(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(CATALOG_IMPORTER_URL_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(CATALOG_IMPORTER_URL_CHANGE_EVENT, listener);
  };
}

function getCatalogImporterUrlSnapshot() {
  return window.location.search;
}

function getCatalogImporterServerUrlSnapshot() {
  return "";
}

function getCatalogImporterColumnFilters(search: string): ColumnFiltersState {
  const params = new URLSearchParams(search);

  return CATALOG_IMPORTER_PREVIEW_FILTER_IDS.flatMap((id) => {
    const values = params.getAll(id);
    if (values.length === 0) return [];

    const definition = getPublicCatalogSearchFilterDefinition(id);
    const value =
      definition?.kind === "facet"
        ? values
        : definition?.kind === "boolean"
          ? values[0] === "true"
          : values[0];

    return [{ id, value }];
  });
}

function writeCatalogImporterColumnFilters(
  params: URLSearchParams,
  filters: ColumnFiltersState,
) {
  CATALOG_IMPORTER_PREVIEW_FILTER_IDS.forEach((id) => params.delete(id));

  for (const { id, value } of filters) {
    if (!CATALOG_IMPORTER_PREVIEW_FILTER_IDS.includes(id)) continue;

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (
          typeof entry === "string" ||
          typeof entry === "number" ||
          typeof entry === "boolean"
        ) {
          params.append(id, String(entry));
        }
      });
    } else if (
      (typeof value === "string" ||
        typeof value === "number" ||
        value === true) &&
      String(value).length > 0
    ) {
      params.set(id, String(value));
    }
  }
}

function pushCatalogImporterUrl(update: (params: URLSearchParams) => void) {
  const url = new URL(window.location.href);
  update(url.searchParams);
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) return;

  window.history.pushState(null, "", nextUrl);
  window.dispatchEvent(new Event(CATALOG_IMPORTER_URL_CHANGE_EVENT));
}

interface CatalogImporterResultsProps {
  controller: CatalogImporterWorkbenchController;
}

export function CatalogImporterResults({
  activeStep,
  controller,
  membershipPriceDisplay,
  onStepChange,
  viewerResolution,
}: CatalogImporterResultsProps & {
  activeStep: CatalogImporterStep;
  membershipPriceDisplay: MembershipPriceDisplay | null;
  onStepChange: (step: CatalogImporterStep) => void;
  viewerResolution: CatalogImporterViewerResolution;
}) {
  const [matchEditorRowId, setMatchEditorRowId] = useState<string | null>(null);
  const [previewGlobalFilter, setPreviewGlobalFilter] = useState("");
  const urlSearch = useSyncExternalStore(
    subscribeToCatalogImporterUrl,
    getCatalogImporterUrlSnapshot,
    getCatalogImporterServerUrlSnapshot,
  );
  const previewColumnFilters = useMemo(
    () => getCatalogImporterColumnFilters(urlSearch),
    [urlSearch],
  );
  const insightParam = useMemo(
    () => new URLSearchParams(urlSearch).get("insight"),
    [urlSearch],
  );
  const dashboardReturnPath = useMemo(
    () =>
      new URLSearchParams(urlSearch).get("returnTo") === "/dashboard/imports"
        ? "/dashboard/imports"
        : null,
    [urlSearch],
  );
  const completionStats = useMemo(() => {
    const listingRows = (controller.matchedRows ?? []).filter(
      (row) => row.rowKind === "listing",
    );
    const includedRows = listingRows.filter(
      (row) => row.outputState === "included",
    );

    return {
      spreadsheetRowCount: listingRows.length,
      automaticallyLinkedCount: includedRows.filter(
        (row) =>
          row.linkState === "linked" &&
          row.match !== null &&
          row.linkProvenance !== "user-confirmed",
      ).length,
      manuallyLinkedCount: includedRows.filter(
        (row) =>
          row.linkState === "linked" &&
          row.match !== null &&
          row.linkProvenance === "user-confirmed",
      ).length,
      unlinkedCount: includedRows.filter(
        (row) => row.linkState !== "linked" || row.match === null,
      ).length,
      excludedCount: listingRows.filter((row) => row.outputState === "removed")
        .length,
      issuesCorrectedCount: controller.completedIssueCount,
      readyForImportCount: listingRows.filter(
        (row) => getCatalogImportRowDisposition(row) === "ready",
      ).length,
    };
  }, [controller.completedIssueCount, controller.matchedRows]);
  const insightView: AnalysisView = isCatalogImporterAnalysisView(insightParam)
    ? insightParam
    : "hybridizer";
  const matchEditorRow =
    controller.includedRows.find((row) => row.id === matchEditorRowId) ?? null;
  const remainingWorkCount =
    controller.reviewRows.length + controller.remainingIssueCount;
  const matchedCount =
    completionStats.automaticallyLinkedCount +
    completionStats.manuallyLinkedCount;
  const completionSummary = [
    `${matchedCount.toLocaleString()} matched`,
    completionStats.unlinkedCount > 0
      ? `${completionStats.unlinkedCount.toLocaleString()} unlinked`
      : null,
    completionStats.excludedCount > 0
      ? `${completionStats.excludedCount.toLocaleString()} excluded`
      : null,
    remainingWorkCount > 0
      ? `${remainingWorkCount.toLocaleString()} need review`
      : "Review complete",
  ].filter((value): value is string => value !== null);
  const previewNextStep: CatalogImporterStep =
    controller.reviewProgressTotal > 0
      ? "review"
      : controller.issueProgressTotal > 0
        ? "issues"
        : "download";
  const reviewNextStep: CatalogImporterStep =
    controller.issueProgressTotal > 0 ? "issues" : "download";
  const continueToStep = (step: CatalogImporterStep) => {
    onStepChange(step);
  };
  const handleOpenReview = useCallback((row: CatalogImportRow) => {
    setMatchEditorRowId(row.id);
  }, []);
  const handleApplyInsightFilter = useCallback(
    (insightFilter: CatalogImporterInsightFilter) => {
      setPreviewGlobalFilter("");
      const nextFilters = [
        { id: insightFilter.id, value: insightFilter.value },
      ];
      pushCatalogImporterUrl((params) => {
        params.set("insight", insightFilter.view);
        writeCatalogImporterColumnFilters(params, nextFilters);
      });
    },
    [],
  );
  const handlePreviewColumnFiltersChange = useCallback<
    OnChangeFn<ColumnFiltersState>
  >(
    (nextFilters) => {
      const resolvedFilters =
        typeof nextFilters === "function"
          ? nextFilters(previewColumnFilters)
          : nextFilters;
      pushCatalogImporterUrl((params) => {
        writeCatalogImporterColumnFilters(params, resolvedFilters);
      });
    },
    [previewColumnFilters],
  );
  const handleInsightViewChange = useCallback((nextView: AnalysisView) => {
    pushCatalogImporterUrl((params) => {
      params.set("insight", nextView);
    });
  }, []);
  return (
    <div
      id={`catalog-importer-step-${activeStep}`}
      className={cn(
        "flex min-w-0 !scroll-mt-16 flex-col",
        activeStep === "preview" && "gap-14 sm:gap-16",
        (activeStep === "review" || activeStep === "issues") &&
          "gap-10 sm:gap-12",
        activeStep === "download" && "gap-0",
      )}
    >
      {activeStep === "preview" ? (
        <>
          <CatalogImporterOverview
            controller={controller}
            onStepChange={onStepChange}
          />
          <CatalogImporterAnalysis
            rows={controller.includedRows}
            onApplyFilter={handleApplyInsightFilter}
            onViewChange={handleInsightViewChange}
            view={insightView}
          />
          <CatalogImporterCatalogPreview
            columnFilters={previewColumnFilters}
            controller={controller}
            globalFilter={previewGlobalFilter}
            onColumnFiltersChange={handlePreviewColumnFiltersChange}
            onGlobalFilterChange={setPreviewGlobalFilter}
            onOpenReview={handleOpenReview}
          />
          {!dashboardReturnPath ? (
            <CatalogImporterPublishActions
              controller={controller}
              membershipPriceDisplay={membershipPriceDisplay}
              placement="preview"
              viewerResolution={viewerResolution}
            />
          ) : null}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => continueToStep(previewNextStep)}
            >
              {previewNextStep === "review"
                ? controller.reviewRows.length > 0
                  ? "Continue to review"
                  : "View review decisions"
                : previewNextStep === "issues"
                  ? "Continue to issues"
                  : "Continue to finish"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </>
      ) : null}

      {activeStep === "review" ? (
        <>
          {controller.reviewRows.length > 0 ? (
            <CatalogImporterReviewQuiz
              controller={controller}
              onFindDifferentCultivar={handleOpenReview}
            />
          ) : (
            <Empty className="py-8 md:py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Review complete</EmptyTitle>
                <EmptyDescription>
                  {controller.reviewProgressTotal === 0
                    ? "No potential matches needed review."
                    : `All ${controller.reviewProgressTotal.toLocaleString()} potential ${
                        controller.reviewProgressTotal === 1
                          ? "match"
                          : "matches"
                      } reviewed.`}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <CatalogImporterReviewedRows controller={controller} />
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => continueToStep(reviewNextStep)}
            >
              {reviewNextStep === "issues"
                ? "Continue to issues"
                : "Continue to finish"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </>
      ) : null}

      {activeStep === "issues" ? (
        <>
          {controller.issueCount > 0 || controller.counts.warningCount > 0 ? (
            <CatalogImporterIssues controller={controller} />
          ) : (
            <Empty className="py-8 md:py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CheckCircle2 aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Issue review complete</EmptyTitle>
                <EmptyDescription>
                  {controller.issueProgressTotal.toLocaleString()} items
                  reviewed
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <CatalogImporterReviewedIssues controller={controller} />
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => continueToStep("download")}>
              Continue to finish
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </>
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

      {activeStep === "download" ? (
        <section
          id="catalog-importer-download"
          aria-labelledby="catalog-importer-download-heading"
          className="flex flex-col gap-14 sm:gap-16"
        >
          <div className="flex max-w-3xl flex-col gap-3">
            <h2
              id="catalog-importer-download-heading"
              className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl"
            >
              {completionStats.readyForImportCount.toLocaleString()}{" "}
              {completionStats.readyForImportCount === 1
                ? "listing"
                : "listings"}{" "}
              ready
            </h2>
            <p className="text-muted-foreground text-base">
              {completionSummary.join(" · ")}
            </p>
          </div>

          <CatalogImporterPublishActions
            controller={controller}
            dashboardReturnPath={dashboardReturnPath}
            membershipPriceDisplay={membershipPriceDisplay}
            placement="finish"
            viewerResolution={viewerResolution}
          />

          <section
            aria-labelledby="catalog-importer-files-heading"
            className="flex flex-col gap-6"
          >
            <div className="flex max-w-3xl flex-col gap-2">
              <h2
                id="catalog-importer-files-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                Or download your files
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Both files can be uploaded again. Downloads contain values
                without spreadsheet formatting, formulas, drawings, or macros.
                Nothing is published.
              </p>
            </div>
            <CatalogImporterDownloadOptions controller={controller} />
          </section>
        </section>
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
