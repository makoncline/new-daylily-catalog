"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ColumnFiltersState, OnChangeFn } from "@tanstack/react-table";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  Sparkles,
  Undo2,
} from "lucide-react";
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
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
import { CatalogImporterMatchSheet } from "@/app/(public)/catalog-importer/_components/catalog-importer-match-sheet";
import { CatalogImporterOverview } from "@/app/(public)/catalog-importer/_components/catalog-importer-overview";
import { CatalogImporterReviewQuiz } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-quiz";
import type { CatalogImporterStep } from "@/app/(public)/catalog-importer/_components/catalog-importer-step-nav";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import type { CatalogImportRow } from "@/lib/catalog-importer";
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
  membershipPriceDisplay,
  viewerState,
}: {
  ctaId: string;
  controller: CatalogImporterWorkbenchController;
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
      className="bg-muted/25 grid gap-5 border-y px-1 py-6 sm:px-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
      ref={trackPromptImpression}
    >
      <div className="max-w-3xl">
        <h2
          id={`${ctaId}-heading`}
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          Build a public catalog with Pro
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Publish and manage this collection with a hosted catalog and seller
          dashboard. Your prepared workbook remains free.
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
    <details id="catalog-importer-unmatched" className="border-y py-3">
      <summary className="cursor-pointer text-sm font-medium">
        {rows.length.toLocaleString()} left unmatched
      </summary>
      <ItemGroup className="mt-3 max-h-96 overflow-auto">
        {rows.map((row, index) => (
          <Fragment key={row.id}>
            {index > 0 ? <ItemSeparator /> : null}
            <Item role="listitem" size="sm" className="px-0">
              <ItemContent className="min-w-0">
                <ItemTitle className="truncate">{row.sourceTitle}</ItemTitle>
                <ItemDescription>Source row {row.sourceRow}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Review ${row.sourceTitle} again`}
                  onClick={() => controller.restoreUnmatchedRow(row.id)}
                >
                  Review again
                </Button>
              </ItemActions>
            </Item>
          </Fragment>
        ))}
      </ItemGroup>
    </details>
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
  const [pendingDownload, setPendingDownload] = useState<
    "clean" | "enriched" | null
  >(null);
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
  const insightView: AnalysisView = isCatalogImporterAnalysisView(insightParam)
    ? insightParam
    : "hybridizer";
  const previewFilterInteractionTracked = useRef(false);
  const matchEditorRow =
    controller.includedRows.find((row) => row.id === matchEditorRowId) ?? null;
  const readyToDownload =
    controller.reviewRows.length === 0 && controller.remainingIssueCount === 0;
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
  const requestDownload = (kind: "clean" | "enriched") => {
    if (
      controller.reviewRows.length > 0 ||
      controller.remainingIssueCount > 0
    ) {
      setPendingDownload(kind);
      return;
    }

    void controller.downloadResults(kind);
  };

  return (
    <div className="min-w-0 space-y-8">
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
          {!membershipStarted &&
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
                ? "Continue to review"
                : previewNextStep === "issues"
                  ? "Continue to issues"
                  : "Continue to download"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </>
      ) : null}

      {activeStep === "review" ? (
        <>
          {controller.lastLinkAction ? (
            <div
              role="status"
              className="flex flex-col gap-2 border-y py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium">
                {controller.lastLinkAction.displayName}{" "}
                {controller.lastLinkAction.kind === "excluded"
                  ? "was excluded from the prepared workbook."
                  : controller.lastLinkAction.kind === "left-unmatched"
                    ? "will remain unmatched in the prepared workbook."
                    : "is now linked in your preview."}
              </p>
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
          ) : null}
          {controller.reviewRows.length > 0 ? (
            <CatalogImporterReviewQuiz
              controller={controller}
              onFindDifferentCultivar={handleOpenReview}
            />
          ) : (
            <div className="border-y py-5">
              <p className="font-medium">Names reviewed</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {controller.reviewProgressTotal.toLocaleString()} reviewed ·{" "}
                {controller.counts.linkedListingCount.toLocaleString()} linked
                {controller.counts.intentionallyUnmatchedCount > 0
                  ? ` · ${controller.counts.intentionallyUnmatchedCount.toLocaleString()} left unmatched`
                  : ""}
                {(controller.matchedRows ?? []).some(
                  (row) => row.outputState === "removed",
                )
                  ? ` · ${(controller.matchedRows ?? []).filter((row) => row.outputState === "removed").length.toLocaleString()} excluded`
                  : ""}
              </p>
            </div>
          )}
          <CatalogImporterUnmatchedRows controller={controller} />
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => continueToStep(reviewNextStep)}
            >
              {reviewNextStep === "issues"
                ? "Continue to issues"
                : "Continue to download"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </>
      ) : null}

      {activeStep === "issues" ? (
        <>
          {controller.lastIssueAction ? (
            <div
              role="status"
              className="flex flex-col gap-2 border-y py-3 sm:flex-row sm:items-center sm:justify-between"
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
          {controller.issueCount > 0 || controller.counts.warningCount > 0 ? (
            <CatalogImporterIssues controller={controller} />
          ) : (
            <div className="border-y py-5">
              <p className="font-medium">Spreadsheet reviewed</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {controller.issueProgressTotal.toLocaleString()} items reviewed
              </p>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => continueToStep("download")}>
              Continue to download
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
              {readyToDownload
                ? "Your prepared spreadsheet is ready"
                : "Download your current spreadsheet"}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {remainingWork.length > 0
                ? `${remainingWork.join(" and ")} remain. `
                : null}
              Upload either prepared file again later and we will recognize its
              Daylily Catalog IDs and corrected fields.
            </p>
          </div>

          <ItemGroup className="border-y">
            <Item className="flex-col items-stretch gap-3 px-0 py-5 sm:flex-row sm:items-center">
              <ItemContent>
                <ItemTitle>Catalog-only spreadsheet</ItemTitle>
                <ItemDescription className="line-clamp-none">
                  One normalized listing table without excluded rows or
                  unrelated columns.
                </ItemDescription>
              </ItemContent>
              <ItemActions className="w-full sm:w-auto">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={controller.downloadingResults !== null}
                  onClick={() => requestDownload("clean")}
                >
                  {controller.downloadingResults === "clean" ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Download data-icon="inline-start" />
                  )}
                  Download catalog-only spreadsheet
                </Button>
              </ItemActions>
            </Item>
            <ItemSeparator />
            <Item className="flex-col items-stretch gap-3 px-0 py-5 sm:flex-row sm:items-center">
              <ItemContent>
                <ItemTitle>Original workbook with catalog data</ItemTitle>
                <ItemDescription className="line-clamp-none">
                  Your original sheets and rows with mapped fields, corrections,
                  and Daylily Catalog references.
                </ItemDescription>
              </ItemContent>
              <ItemActions className="w-full sm:w-auto">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  variant="outline"
                  disabled={controller.downloadingResults !== null}
                  onClick={() => requestDownload("enriched")}
                >
                  {controller.downloadingResults === "enriched" ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Download data-icon="inline-start" />
                  )}
                  Download original workbook
                </Button>
              </ItemActions>
            </Item>
          </ItemGroup>

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
                {controller.downloadSummary.appliedCorrectionCount > 0 ? (
                  <li>
                    Include{" "}
                    {controller.downloadSummary.appliedCorrectionCount.toLocaleString()}{" "}
                    seller-approved{" "}
                    {controller.downloadSummary.appliedCorrectionCount === 1
                      ? "correction"
                      : "corrections"}
                  </li>
                ) : null}
                {controller.downloadSummary.intentionallyUnmatchedCount > 0 ? (
                  <li>
                    Add Daylily Catalog identity to{" "}
                    {controller.downloadSummary.linkedIdentityCount.toLocaleString()}{" "}
                    linked{" "}
                    {controller.downloadSummary.linkedIdentityCount === 1
                      ? "listing"
                      : "listings"}
                  </li>
                ) : null}
                {controller.downloadSummary.removedRowCount > 0 ? (
                  <li>
                    Keep{" "}
                    {controller.downloadSummary.intentionallyUnmatchedCount.toLocaleString()}{" "}
                    intentionally unmatched{" "}
                    {controller.downloadSummary.intentionallyUnmatchedCount ===
                    1
                      ? "listing"
                      : "listings"}
                  </li>
                ) : null}
                {controller.downloadSummary.unresolvedCultivarCount +
                  controller.downloadSummary.unresolvedValueCount +
                  controller.downloadSummary.unresolvedWarningCount >
                0 ? (
                  <li>
                    Exclude from the clean catalog{" "}
                    {controller.downloadSummary.removedRowCount.toLocaleString()}{" "}
                    source{" "}
                    {controller.downloadSummary.removedRowCount === 1
                      ? "row"
                      : "rows"}
                  </li>
                ) : null}
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
                The catalog-only spreadsheet contains one normalized listing
                table. The original workbook retains every worksheet and source
                row as a value-only workbook. Mapped headers are standardized to
                Name, Price, Description, and Private Note. Reference photos,
                awards, and cultivar attributes are not copied. Formulas,
                formatting, merged cells, drawings, comments, macros,
                validation, and hidden state are not preserved. Nothing is
                published or imported.
              </p>
            </details>
          ) : null}
          {!membershipStarted &&
          (viewerState === "anonymous" ||
            viewerState === "signed_in_nonpro") ? (
            <CatalogImporterMembershipPrompt
              ctaId="catalog-importer-download-membership"
              controller={controller}
              membershipPriceDisplay={membershipPriceDisplay}
              viewerState={viewerState}
            />
          ) : null}
        </section>
      ) : null}

      <AlertDialog
        open={pendingDownload !== null}
        onOpenChange={(open) => !open && setPendingDownload(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Download before review is complete?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {[
                controller.reviewRows.length > 0
                  ? `${controller.reviewRows.length.toLocaleString()} potential ${controller.reviewRows.length === 1 ? "match" : "matches"}`
                  : null,
                controller.remainingIssueCount > 0
                  ? `${controller.remainingIssueCount.toLocaleString()} spreadsheet ${controller.remainingIssueCount === 1 ? "item" : "items"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" and ")}{" "}
              remain to review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const kind = pendingDownload;
                setPendingDownload(null);
                if (kind) void controller.downloadResults(kind);
              }}
            >
              Download anyway
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
