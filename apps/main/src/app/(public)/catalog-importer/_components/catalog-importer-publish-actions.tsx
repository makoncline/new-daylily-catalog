"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import {
  ProUpgrade,
  ProUpgradeActions,
  ProUpgradeContent,
  ProUpgradeDescription,
  ProUpgradeDetails,
  ProUpgradeFeature,
  ProUpgradeFeatures,
  ProUpgradeHeader,
  ProUpgradeSubtitle,
  ProUpgradeTitle,
} from "@/components/pro-upgrade";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  getSubscriptionPriceCopy,
  SUBSCRIPTION_CONFIG,
} from "@/config/subscription-config";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  createCatalogImporterCheckoutPath,
  createCatalogImporterCheckoutSource,
  type CatalogImporterViewerResolution,
  type CatalogImporterViewerState,
} from "@/lib/catalog-importer-membership";
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
          Publish with {SUBSCRIPTION_CONFIG.OFFER.PRODUCT_NAME}
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
            <ArrowRight data-icon="inline-end" />
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
  const priceCopy = membershipPriceDisplay
    ? getSubscriptionPriceCopy(membershipPriceDisplay)
    : null;
  return (
    <ProUpgrade
      aria-labelledby={`${ctaId}-heading`}
      className={placement === "preview" ? "py-4 sm:py-6" : undefined}
    >
      <ProUpgradeHeader>
        {placement === "finish" ? (
          <p className="text-xs font-semibold tracking-wide text-[#b7791f] uppercase">
            Recommended
          </p>
        ) : null}
        <ProUpgradeTitle id={`${ctaId}-heading`}>
          {placement === "finish"
            ? "Publish your catalog"
            : "Publish this catalog with Pro"}
        </ProUpgradeTitle>
        <ProUpgradeDescription>
          {placement === "finish"
            ? "Give buyers a public, searchable catalog."
            : "Give buyers one public link where they can browse listings, filter cultivars, view registered details, and send inquiries. Manage updates from your seller dashboard."}
        </ProUpgradeDescription>
      </ProUpgradeHeader>
      <ProUpgradeContent>
        <ProUpgradeDetails>
          <ProUpgradeSubtitle>What Pro adds</ProUpgradeSubtitle>
          <ProUpgradeFeatures>
            {[
              "One public catalog link",
              "Searchable listings and details",
              "Direct buyer inquiries",
              "Daylily Catalog discovery eligibility",
            ].map((feature) => (
              <ProUpgradeFeature key={feature}>
                <Check className="text-muted-foreground size-4 shrink-0" />
                {feature}
              </ProUpgradeFeature>
            ))}
          </ProUpgradeFeatures>
        </ProUpgradeDetails>
        <ProUpgradeActions className="gap-2">
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
          {priceCopy ? (
            <p className="text-muted-foreground text-center text-xs">
              {priceCopy.summaryWithCancellation}
            </p>
          ) : (
            <p className="text-muted-foreground text-center text-xs">
              {SUBSCRIPTION_CONFIG.COPY.IMPORTER.PRICE_UNAVAILABLE}
            </p>
          )}
          {placement === "preview" ? (
            <Link
              href="/start-membership"
              className="text-muted-foreground text-center text-xs underline-offset-4 hover:underline"
              data-ph-capture-attribute-action="pro-details"
              data-ph-capture-attribute-cta_id={`${ctaId}-details`}
            >
              See Pro details
            </Link>
          ) : null}
        </ProUpgradeActions>
      </ProUpgradeContent>
    </ProUpgrade>
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
      variant="link"
      size="sm"
      className="h-auto w-full p-0"
      disabled={leaving}
      onClick={() => void openLogin()}
    >
      {leaving ? <Spinner data-icon="inline-start" /> : null}
      Sign in instead
    </Button>
  );
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
      const targetPath = createCatalogImporterCheckoutPath(
        controller.projectId,
      );
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
        data-ph-capture-attribute-action="start-pro-checkout"
        data-ph-capture-attribute-cta_id={ctaId}
        disabled={leaving}
        onClick={() => void startTrial()}
      >
        {leaving ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Sparkles data-icon="inline-start" />
        )}
        {SUBSCRIPTION_CONFIG.COPY.CTA.START_TRIAL}
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
    try {
      await controller.flushDraft();
      const { url } = await checkout.mutateAsync({
        ...createCatalogImporterCheckoutSource(controller.projectId),
      });
      window.location.assign(url);
    } catch {
      startInProgressRef.current = false;
      setLeaving(false);
      setStartError(true);
      capturePosthogEvent("checkout_failed", {
        import_id: controller.projectId,
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
        data-ph-capture-attribute-action="start-pro-checkout"
        data-ph-capture-attribute-cta_id={ctaId}
        disabled={leaving}
        onClick={() => void startTrial()}
      >
        {leaving ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Sparkles data-icon="inline-start" />
        )}
        {SUBSCRIPTION_CONFIG.COPY.CTA.START_TRIAL}
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
