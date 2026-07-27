"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { SellerIntentLink } from "@/components/seller-intent-link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  CATALOG_IMPORTER_RETURN_PATH,
  catalogImporterConversionIdSchema,
  createCatalogImporterCheckoutPath,
  createCatalogImporterCheckoutSource,
  type CatalogImporterViewerResolution,
  type CatalogImporterViewerState,
} from "@/lib/catalog-importer-membership";
import { cn } from "@/lib/utils";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";
import { api, TRPCReactProvider } from "@/trpc/react";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

interface CatalogImporterPublishActionsProps {
  controller: CatalogImporterWorkbenchController;
  dashboardReturnPath?: string | null;
  membershipPriceDisplay: MembershipPriceDisplay | null;
  placement: "preview" | "finish";
  viewerResolution: CatalogImporterViewerResolution;
}

export function CatalogImporterPublishActions({
  controller,
  dashboardReturnPath = null,
  membershipPriceDisplay,
  placement,
  viewerResolution,
}: CatalogImporterPublishActionsProps) {
  if (viewerResolution.status !== "ready") {
    return (
      <section className="border-primary/50 bg-primary/5 space-y-4 rounded-lg border p-5">
        <h3 className="text-xl font-semibold">
          Publish with Daylily Catalog Pro
        </h3>
        {viewerResolution.status === "checking" ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Spinner />
            Checking your account…
          </p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm leading-6">
              {controller.storageWarning
                ? "We could not check your account. Keep this page open so you do not lose the catalog that is still in memory."
                : "We could not check your account. Your catalog progress is saved in this browser, so you can reload this page to try again."}
            </p>
            {!controller.storageWarning ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload account status
              </Button>
            ) : null}
          </>
        )}
      </section>
    );
  }

  const { viewerState } = viewerResolution;
  if (viewerState === "pro") {
    return placement === "finish" ? (
      <section className="border-primary/50 bg-primary/5 space-y-4 rounded-lg border p-5">
        <h3 className="text-xl font-semibold">Create your ready listings</h3>
        <p className="text-muted-foreground text-sm leading-6">
          Review the ready batch in your dashboard before any listings are
          created.
        </p>
        <Button asChild>
          <Link href={dashboardReturnPath ?? "/dashboard/imports"}>
            Continue to import
            <ArrowRight />
          </Link>
        </Button>
      </section>
    ) : null;
  }

  return (
    <CatalogImporterMembershipPrompt
      controller={controller}
      ctaId={
        placement === "preview"
          ? "catalog-importer-preview-membership"
          : "catalog-importer-download-membership"
      }
      membershipPriceDisplay={membershipPriceDisplay}
      placement={placement}
      viewerState={viewerState}
    />
  );
}

function CatalogImporterMembershipPrompt({
  ctaId,
  controller,
  membershipPriceDisplay,
  placement,
  viewerState,
}: {
  ctaId: string;
  controller: CatalogImporterWorkbenchController;
  membershipPriceDisplay: MembershipPriceDisplay | null;
  placement: "preview" | "finish";
  viewerState: Exclude<CatalogImporterViewerState, "pro">;
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
      className={cn(
        "border-primary/50 bg-primary/5 grid gap-5 rounded-lg border px-5 py-6",
        placement === "preview" &&
          "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
      )}
      ref={trackPromptImpression}
    >
      <div className="max-w-3xl">
        <h2
          id={`${ctaId}-heading`}
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          {placement === "finish"
            ? "Publish with Daylily Catalog Pro"
            : "Publish this catalog with Pro"}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Give buyers one public link where they can browse listings, filter
          cultivars, view registered details, and send inquiries. Manage updates
          from your seller dashboard.
        </p>
        <ul className="text-muted-foreground mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <li>One public catalog link</li>
          <li>Searchable listings and details</li>
          <li>Direct buyer inquiries</li>
          <li>Daylily Catalog discovery eligibility</li>
        </ul>
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
        {placement === "finish" && viewerState === "anonymous" ? (
          <CatalogImporterLoginButton controller={controller} />
        ) : null}
        {membershipPriceDisplay ? (
          <p className="text-muted-foreground text-center text-xs">
            No charge today. Then {membershipPriceDisplay.amount}
            {membershipPriceDisplay.interval}. Cancel anytime.
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
    const parsed = catalogImporterConversionIdSchema.safeParse(existing);
    if (parsed.success) {
      return parsed.data;
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
  const [startError, setStartError] = useState(false);
  const startInProgressRef = useRef(false);

  const startTrial = async () => {
    if (startInProgressRef.current) {
      return;
    }

    startInProgressRef.current = true;
    setLeaving(true);
    setStartError(false);
    try {
      const conversionId = getCatalogImporterConversionId();
      const targetPath = createCatalogImporterCheckoutPath(conversionId);
      trackTrialCta(ctaId, targetPath, conversionId);
      await controller.flushDraft();
      window.location.assign(targetPath);
    } catch {
      startInProgressRef.current = false;
      setLeaving(false);
      setStartError(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="lg"
        disabled={leaving}
        onClick={() => void startTrial()}
      >
        {leaving ? <Spinner /> : <Sparkles className="size-4" />}
        Start {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day Pro trial
      </Button>
      {startError ? (
        <p className="text-destructive text-center text-xs" role="alert">
          {controller.storageWarning
            ? "Checkout did not open. Keep this page open and try again."
            : "Checkout did not open. Your catalog is still saved. Try again."}
        </p>
      ) : null}
    </>
  );
}

function SignedInCatalogImporterMembershipButton({
  controller,
  ctaId,
}: {
  controller: CatalogImporterWorkbenchController;
  ctaId: string;
}) {
  const checkout = api.catalogImporter.createSignedInCheckout.useMutation();
  const [leaving, setLeaving] = useState(false);
  const [startError, setStartError] = useState(false);
  const startInProgressRef = useRef(false);

  const startTrial = async () => {
    if (startInProgressRef.current) {
      return;
    }

    startInProgressRef.current = true;
    setLeaving(true);
    setStartError(false);
    let conversionId: string | null = null;
    try {
      conversionId = getCatalogImporterConversionId();
      trackTrialCta(ctaId, "stripe_checkout", conversionId);
      capturePosthogEvent("checkout_started", {
        conversion_id: conversionId,
        entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
        source: "catalog_importer",
      });
      await controller.flushDraft();
      const { url } = await checkout.mutateAsync({
        ...createCatalogImporterCheckoutSource(conversionId),
      });
      capturePosthogEvent("checkout_redirect_ready", {
        conversion_id: conversionId,
        entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
        source: "catalog_importer",
      });
      window.location.assign(url);
    } catch {
      startInProgressRef.current = false;
      setLeaving(false);
      setStartError(true);
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
        disabled={leaving}
        onClick={() => void startTrial()}
      >
        {leaving ? <Spinner /> : <Sparkles className="size-4" />}
        Start {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day Pro trial
      </Button>
      {startError ? (
        <p className="text-destructive text-center text-xs" role="alert">
          {controller.storageWarning
            ? "Checkout did not open. Keep this page open and try again."
            : "Checkout did not open. Your catalog is still saved. Try again."}
        </p>
      ) : null}
    </>
  );
}
