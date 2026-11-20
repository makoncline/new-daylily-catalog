"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import {
  createCatalogImporterCheckoutSource,
  type CatalogImporterViewerState,
} from "@/lib/catalog-importer-membership";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/trpc/query-client";
import { getTrpcClient } from "@/trpc/client";

interface CatalogImportCheckoutController {
  projectId: string;
  flushDraft: () => Promise<void>;
  storageWarning: string | null;
}

export function CatalogImporterLoginButton({
  controller,
  disabled = false,
}: {
  controller: Pick<CatalogImportCheckoutController, "flushDraft">;
  disabled?: boolean;
}) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  const openLogin = async () => {
    setLeaving(true);
    setError(false);
    try {
      await controller.flushDraft();
      const returnTo = encodeURIComponent("/dashboard/imports");
      router.push(`/sign-in?returnTo=${returnTo}`);
    } catch {
      setError(true);
      setLeaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="w-full"
        disabled={disabled || leaving}
        onClick={() => void openLogin()}
      >
        {leaving ? <Spinner data-icon="inline-start" /> : null}
        Sign in instead
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          Could not save your import. Keep this page open and try again.
        </p>
      ) : null}
    </>
  );
}

export function CatalogImporterMembershipButton({
  controller,
  disabled = false,
  ctaId,
  viewerState,
}: {
  controller: Pick<
    CatalogImportCheckoutController,
    "projectId" | "flushDraft" | "storageWarning"
  >;
  ctaId: string;
  disabled?: boolean;
  viewerState: Exclude<CatalogImporterViewerState, "pro">;
}) {
  const [leaving, setLeaving] = useState(false);
  const [startError, setStartError] = useState(false);
  const startInProgressRef = useRef(false);

  const openCheckout = async () => {
    if (startInProgressRef.current) {
      return;
    }

    startInProgressRef.current = true;
    setLeaving(true);
    setStartError(false);
    try {
      const checkoutSource = createCatalogImporterCheckoutSource(
        controller.projectId,
      );
      await controller.flushDraft();
      const analyticsProperties = {
        source: "catalog_importer",
        import_id: checkoutSource.importId,
        entry_source: checkoutSource.entrySource,
      };
      capturePosthogEvent("checkout_started", analyticsProperties);
      const catalogImporter = getTrpcClient().catalogImporter;
      const checkout =
        viewerState === "anonymous"
          ? await catalogImporter.createCheckout.mutate(checkoutSource)
          : await catalogImporter.createSignedInCheckout.mutate(checkoutSource);
      capturePosthogEvent("checkout_redirect_ready", analyticsProperties);
      window.location.assign(checkout.url);
    } catch {
      startInProgressRef.current = false;
      setLeaving(false);
      setStartError(true);
      capturePosthogEvent("checkout_failed", {
        source: "catalog_importer",
        import_id: controller.projectId,
      });
    }
  };

  return (
    <>
      <Button
        type="button"
        size="lg"
        data-ph-capture-attribute-action="start-stripe-checkout"
        data-ph-capture-attribute-cta_id={ctaId}
        disabled={disabled || leaving}
        onClick={() => void openCheckout()}
      >
        {leaving ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Sparkles data-icon="inline-start" />
        )}
        {SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_CHECKOUT}
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

export function CatalogMembershipOffer() {
  const offer = useQuery(
    {
      queryKey: ["catalog-membership-offer"],
      queryFn: () => getTrpcClient().catalogImporter.membershipOffer.query(),
      retry: false,
      staleTime: 60_000,
    },
    getQueryClient(),
  );
  return (
    <p className="text-muted-foreground text-sm">
      {offer.data ? (
        `${offer.data.monthlyPrice} per month. Billing options are shown at checkout.`
      ) : offer.isError ? (
        <>
          Could not load the membership price.{" "}
          <Button variant="link" size="sm" onClick={() => void offer.refetch()}>
            Retry price
          </Button>
        </>
      ) : (
        "Loading membership price…"
      )}
    </p>
  );
}
