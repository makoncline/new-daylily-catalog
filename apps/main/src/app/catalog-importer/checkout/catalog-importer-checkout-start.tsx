"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  getSubscriptionPriceCopy,
  SUBSCRIPTION_CONFIG,
} from "@/config/subscription-config";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import type { CatalogImporterCheckoutSource } from "@/lib/catalog-importer-membership";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";
import { api } from "@/trpc/react";

export function CatalogImporterCheckoutStart({
  checkoutSource,
  membershipPriceDisplay,
}: {
  checkoutSource: CatalogImporterCheckoutSource;
  membershipPriceDisplay: MembershipPriceDisplay;
}) {
  const isReady = useIsHydrated();
  const [email, setEmail] = useState("");
  const createCheckout = api.catalogImporter.createCheckout.useMutation();
  const emailIsValid = /.+@.+\..+/.test(email.trim());
  const priceCopy = getSubscriptionPriceCopy(membershipPriceDisplay);

  const startCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailIsValid) {
      return;
    }

    try {
      const result = await createCheckout.mutateAsync({
        email,
        ...checkoutSource,
      });
      window.location.assign(result.url);
    } catch {
      capturePosthogEvent("checkout_failed", {
        import_id: checkoutSource.importId,
        entry_source: checkoutSource.entrySource,
        source: "catalog_importer",
      });
    }
  };

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:gap-12 sm:py-16 lg:px-8"
      data-ph-capture-attribute-flow="catalog-importer"
      data-ph-capture-attribute-import_id={checkoutSource.importId}
      data-ph-capture-attribute-step="checkout"
    >
      <Link
        href={checkoutSource.returnTo}
        className="text-muted-foreground inline-flex items-center gap-2 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to your catalog
      </Link>

      <form
        className="flex max-w-xl flex-col gap-8"
        onSubmit={(event) => void startCheckout(event)}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {SUBSCRIPTION_CONFIG.COPY.CHECKOUT.TITLE}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {priceCopy.checkoutSummary}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="catalog-importer-checkout-email">Email address</Label>
          <Input
            id="catalog-importer-checkout-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={!isReady}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            data-ph-capture-attribute-action="checkout-submit"
            disabled={!isReady || !emailIsValid || createCheckout.isPending}
          >
            {createCheckout.isPending ? (
              <Spinner />
            ) : (
              <CreditCard className="size-4" />
            )}
            {SUBSCRIPTION_CONFIG.COPY.CTA.CONTINUE_TO_TRIAL}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            {SUBSCRIPTION_CONFIG.COPY.CHECKOUT.FOOTNOTE}
          </p>
        </div>

        {createCheckout.error ? (
          <p className="text-destructive text-sm">
            Checkout did not open. Check your email and try again.
          </p>
        ) : null}
      </form>
    </div>
  );
}
