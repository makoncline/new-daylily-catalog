"use client";

import Link from "next/link";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ColumnFiltersState, OnChangeFn } from "@tanstack/react-table";
import { ArrowRight, CheckCircle2, CircleAlert, Sparkles } from "lucide-react";
import { SellerIntentLink } from "@/components/seller-intent-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  CATALOG_IMPORTER_RETURN_PATH,
  type CatalogImporterViewerState,
} from "@/lib/catalog-importer-membership";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";
import { api, TRPCReactProvider } from "@/trpc/react";
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
import { CatalogImporterReviewQuiz } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-quiz";
import { CatalogImporterReviewedIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-reviewed-issues";
import { CatalogImporterReviewedRows } from "@/app/(public)/catalog-importer/_components/catalog-importer-reviewed-rows";
import type { CatalogImporterStep } from "@/app/(public)/catalog-importer/_components/catalog-importer-step-nav";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import {
  getCatalogImportRowDisposition,
  type CatalogImportRow,
} from "@/lib/catalog-importer";
import { getPublicCatalogSearchFilterDefinition } from "@/components/public-catalog-search/public-catalog-search-registry";

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

function CatalogImporterMembershipPrompt({
  ctaId,
  controller,
  placement = "preview",
  membershipPriceDisplay,
  viewerState,
}: {
  ctaId: string;
  controller: CatalogImporterWorkbenchController;
  placement?: "preview" | "download";
  membershipPriceDisplay: MembershipPriceDisplay | null;
  viewerState: Extract<
    CatalogImporterViewerState,
    "anonymous" | "signed_in_nonpro"
  >;
}) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const impressionTimerRef = useRef<number | null>(null);
  const impressionTrackedRef = useRef(false);
  const trackPromptImpression = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (impressionTimerRef.current !== null) {
        window.clearTimeout(impressionTimerRef.current);
        impressionTimerRef.current = null;
      }
      if (!node) {
        return;
      }

      const impressionKey = `catalog-importer-membership-prompt-viewed:${ctaId}`;
      try {
        if (globalThis.sessionStorage?.getItem(impressionKey) === "1") {
          impressionTrackedRef.current = true;
          return;
        }
      } catch {
        // Visibility tracking still works when storage is unavailable.
      }

      if (typeof IntersectionObserver === "undefined") {
        return;
      }

      observerRef.current = new IntersectionObserver((entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
        );
        if (!visible) {
          if (impressionTimerRef.current !== null) {
            window.clearTimeout(impressionTimerRef.current);
            impressionTimerRef.current = null;
          }
          return;
        }
        if (
          impressionTrackedRef.current ||
          impressionTimerRef.current !== null
        ) {
          return;
        }

        impressionTimerRef.current = window.setTimeout(() => {
          impressionTrackedRef.current = true;
          impressionTimerRef.current = null;
          try {
            globalThis.sessionStorage?.setItem(impressionKey, "1");
          } catch {
            // The event remains useful without session deduplication.
          }
          capturePosthogEvent("catalog_import_membership_prompt_viewed", {
            cta_id: ctaId,
            matched_count: controller.counts.linkedListingCount,
            unique_cultivar_count: controller.counts.uniqueCultivarCount,
          });
          observerRef.current?.disconnect();
          observerRef.current = null;
        }, 1_000);
      });

      observerRef.current.observe(node);
    },
    [
      controller.counts.linkedListingCount,
      controller.counts.uniqueCultivarCount,
      ctaId,
    ],
  );

  return (
    <section
      aria-labelledby={`${ctaId}-heading`}
      className="bg-muted/25 grid gap-5 rounded-lg px-4 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
      ref={trackPromptImpression}
    >
      <div className="max-w-3xl">
        <h2
          id={`${ctaId}-heading`}
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          {placement === "download"
            ? "Ready for import!"
            : "Build a public catalog with Pro"}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {placement === "download"
            ? "Sign up for Daylily Catalog to start."
            : "Publish and manage this collection with a hosted catalog and seller dashboard. Your prepared workbook remains free."}
        </p>
      </div>
      <div className="flex min-w-56 flex-col gap-2 lg:items-stretch">
        {viewerState === "anonymous" ? (
          <AnonymousCatalogImporterMembershipButton
            controller={controller}
            ctaId={ctaId}
          />
        ) : (
          <TRPCReactProvider>
            <SignedInCatalogImporterMembershipButton
              controller={controller}
              ctaId={ctaId}
            />
          </TRPCReactProvider>
        )}
        {placement === "download" && viewerState === "anonymous" ? (
          <CatalogImporterLoginButton controller={controller} />
        ) : null}
        {membershipPriceDisplay ? (
          <p className="text-muted-foreground text-center text-xs">
            Then {membershipPriceDisplay.amount}
            {membershipPriceDisplay.interval}. Progress stays in this browser.
          </p>
        ) : (
          <p className="text-muted-foreground text-center text-xs">
            Progress stays in this browser.
          </p>
        )}
        <SellerIntentLink
          href="/start-membership"
          className="text-muted-foreground text-center text-xs underline-offset-4 hover:underline"
          ctaId={`${ctaId}-details`}
          ctaLabel="See Pro details"
          entrySurface="catalog_importer_preview"
          sourcePageType="catalog_importer"
          sourcePath={CATALOG_IMPORTER_RETURN_PATH}
        >
          See Pro details
        </SellerIntentLink>
      </div>
    </section>
  );
}

function CatalogImporterLoginButton({
  controller,
}: {
  controller: CatalogImporterWorkbenchController;
}) {
  const [leaving, setLeaving] = useState(false);

  const openLogin = async () => {
    setLeaving(true);
    await controller.flushDraft();
    const returnTo = encodeURIComponent("/dashboard/imports");
    window.location.assign(`/sign-in?returnTo=${returnTo}`);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      disabled={leaving}
      onClick={() => void openLogin()}
    >
      {leaving ? <Spinner /> : null}
      Already have an account? Sign in
    </Button>
  );
}

function getCatalogImporterConversionId() {
  const storageKey = "catalog-importer-pro-conversion-id";
  try {
    const existing = globalThis.sessionStorage?.getItem(storageKey);
    if (existing) {
      return existing;
    }
    const created = globalThis.crypto.randomUUID();
    globalThis.sessionStorage?.setItem(storageKey, created);
    return created;
  } catch {
    return globalThis.crypto.randomUUID();
  }
}

function trackTrialCta(
  ctaId: string,
  targetPath: string,
  conversionId: string,
) {
  capturePosthogEvent("seller_cta_clicked", {
    conversion_id: conversionId,
    cta_id: ctaId,
    cta_label: `Start ${SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day Pro trial`,
    entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
    entry_surface: "catalog_importer_preview",
    source_page_type: "catalog_importer",
    source_path: CATALOG_IMPORTER_RETURN_PATH,
    target_path: targetPath,
  });
}

function AnonymousCatalogImporterMembershipButton({
  controller,
  ctaId,
}: {
  controller: CatalogImporterWorkbenchController;
  ctaId: string;
}) {
  const [leaving, setLeaving] = useState(false);

  const startTrial = async () => {
    const conversionId = getCatalogImporterConversionId();
    const params = new URLSearchParams({
      conversion_id: conversionId,
      entry: CATALOG_IMPORTER_ENTRY_SOURCE,
      return_to: CATALOG_IMPORTER_RETURN_PATH,
    });
    const targetPath = `/onboarding?${params.toString()}`;
    setLeaving(true);
    trackTrialCta(ctaId, targetPath, conversionId);
    await controller.flushDraft();
    window.location.assign(targetPath);
  };

  return (
    <Button
      type="button"
      size="lg"
      disabled={leaving}
      onClick={() => void startTrial()}
    >
      {leaving ? <Spinner /> : <Sparkles className="size-4" />}
      Start {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day Pro trial
    </Button>
  );
}

function SignedInCatalogImporterMembershipButton({
  controller,
  ctaId,
}: {
  controller: CatalogImporterWorkbenchController;
  ctaId: string;
}) {
  const checkout = api.stripe.generateCheckout.useMutation();

  const startTrial = async () => {
    const conversionId = getCatalogImporterConversionId();
    trackTrialCta(ctaId, "stripe_checkout", conversionId);
    capturePosthogEvent("checkout_started", {
      conversion_id: conversionId,
      entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
      source: "catalog_importer",
    });
    await controller.flushDraft();
    try {
      const { url } = await checkout.mutateAsync({
        conversionId,
        entrySource: CATALOG_IMPORTER_ENTRY_SOURCE,
        returnTo: CATALOG_IMPORTER_RETURN_PATH,
      });
      capturePosthogEvent("checkout_redirect_ready", {
        conversion_id: conversionId,
        entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
        source: "catalog_importer",
      });
      window.location.assign(url);
    } catch {
      capturePosthogEvent("checkout_failed", {
        conversion_id: conversionId,
        entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
        source: "catalog_importer",
      });
    }
  };

  return (
    <>
      <Button
        type="button"
        size="lg"
        disabled={checkout.isPending}
        onClick={() => void startTrial()}
      >
        {checkout.isPending ? <Spinner /> : <Sparkles className="size-4" />}
        Start {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day Pro trial
      </Button>
      {checkout.error ? (
        <p className="text-destructive text-center text-xs">
          Checkout did not open. Try again.
        </p>
      ) : null}
    </>
  );
}

export function CatalogImporterResults({
  activeStep,
  controller,
  membershipPriceDisplay,
  membershipStarted,
  onStepChange,
  viewerState,
}: CatalogImporterResultsProps & {
  activeStep: CatalogImporterStep;
  membershipPriceDisplay: MembershipPriceDisplay | null;
  membershipStarted: boolean;
  onStepChange: (step: CatalogImporterStep) => void;
  viewerState: CatalogImporterViewerState;
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
  const previewFilterInteractionTracked = useRef(false);
  const matchEditorRow =
    controller.includedRows.find((row) => row.id === matchEditorRowId) ?? null;
  const remainingWork = [
    controller.reviewRows.length > 0
      ? `${controller.reviewRows.length.toLocaleString()} potential ${controller.reviewRows.length === 1 ? "match" : "matches"}`
      : null,
    controller.remainingIssueCount > 0
      ? `${controller.remainingIssueCount.toLocaleString()} spreadsheet ${controller.remainingIssueCount === 1 ? "item" : "items"}`
      : null,
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
      capturePosthogEvent("catalog_import_preview_interacted", {
        filter_type: insightFilter.id,
        interaction_type: "insight",
      });
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
      if (!previewFilterInteractionTracked.current) {
        previewFilterInteractionTracked.current = true;
        capturePosthogEvent("catalog_import_preview_interacted", {
          interaction_type: "search_or_filter",
        });
      }
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
      className="min-w-0 !scroll-mt-16 space-y-6"
    >
      {membershipStarted && activeStep === "preview" ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Your Pro trial is active</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Your browser-local catalog project is still here. Nothing was
              imported automatically.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard">Open seller dashboard</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
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
          {!dashboardReturnPath &&
          !membershipStarted &&
          (viewerState === "anonymous" ||
            viewerState === "signed_in_nonpro") ? (
            <CatalogImporterMembershipPrompt
              ctaId="catalog-importer-preview-membership"
              controller={controller}
              membershipPriceDisplay={membershipPriceDisplay}
              viewerState={viewerState}
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
          className="space-y-6"
        >
          <div className="max-w-3xl">
            <h2
              id="catalog-importer-download-heading"
              className="text-3xl font-semibold tracking-tight"
            >
              {completionStats.readyForImportCount.toLocaleString()}{" "}
              {completionStats.readyForImportCount === 1
                ? "listing"
                : "listings"}{" "}
              ready for import
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              You started with{" "}
              {completionStats.spreadsheetRowCount.toLocaleString()} spreadsheet{" "}
              {completionStats.spreadsheetRowCount === 1 ? "row" : "rows"}.
            </p>
          </div>

          <ul className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <span className="text-foreground font-medium tabular-nums">
                {completionStats.automaticallyLinkedCount.toLocaleString()}
              </span>{" "}
              linked automatically
            </li>
            <li>
              <span className="text-foreground font-medium tabular-nums">
                {completionStats.manuallyLinkedCount.toLocaleString()}
              </span>{" "}
              linked manually
            </li>
            <li>
              <span className="text-foreground font-medium tabular-nums">
                {completionStats.unlinkedCount.toLocaleString()}
              </span>{" "}
              unlinked
            </li>
            <li>
              <span className="text-foreground font-medium tabular-nums">
                {completionStats.excludedCount.toLocaleString()}
              </span>{" "}
              excluded
            </li>
            <li>
              <span className="text-foreground font-medium tabular-nums">
                {completionStats.issuesCorrectedCount.toLocaleString()}
              </span>{" "}
              issues corrected
            </li>
          </ul>

          {remainingWork.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              {remainingWork.join(" and ")} remain and will not be imported.
            </p>
          ) : null}

          {viewerState === "pro" ? (
            <div className="flex justify-end">
              <Button asChild>
                <Link href={dashboardReturnPath ?? "/dashboard/imports"}>
                  Continue to import
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : null}

          {viewerState !== "pro" &&
          !membershipStarted &&
          (viewerState === "anonymous" ||
            viewerState === "signed_in_nonpro") ? (
            <CatalogImporterMembershipPrompt
              ctaId="catalog-importer-download-membership"
              controller={controller}
              placement="download"
              membershipPriceDisplay={membershipPriceDisplay}
              viewerState={viewerState}
            />
          ) : null}

          <CatalogImporterDownloadOptions controller={controller} />

          {controller.downloadSummary ? (
            <details className="mt-4 max-w-3xl">
              <summary className="cursor-pointer text-sm font-medium">
                File details
              </summary>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Both files can be uploaded to this builder again. They contain
                values, not spreadsheet formatting, formulas, drawings, or
                macros. Nothing is published or imported by downloading them.
              </p>
            </details>
          ) : null}
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
