"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  CATALOG_IMPORTER_RETURN_PATH,
} from "@/lib/catalog-importer-membership";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";
import { api } from "@/trpc/react";

export function CatalogImporterCheckoutStart({
  conversionId,
  membershipPriceDisplay,
}: {
  conversionId: string;
  membershipPriceDisplay: MembershipPriceDisplay;
}) {
  const [email, setEmail] = useState("");
  const createCheckout = api.onboarding.createCheckout.useMutation();
  const emailIsValid = /.+@.+\..+/.test(email.trim());

  const startCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailIsValid) {
      return;
    }

    capturePosthogEvent("checkout_started", {
      conversion_id: conversionId,
      entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
      source: "catalog_importer",
    });
    try {
      const result = await createCheckout.mutateAsync({
        conversionId,
        draftId: conversionId,
        email,
        entrySource: CATALOG_IMPORTER_ENTRY_SOURCE,
        returnTo: CATALOG_IMPORTER_RETURN_PATH,
      });
      capturePosthogEvent("checkout_redirect_ready", {
        conversion_id: conversionId,
        entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
        source: "catalog_importer",
      });
      window.location.assign(result.url);
    } catch {
      capturePosthogEvent("checkout_failed", {
        conversion_id: conversionId,
        entry_source: CATALOG_IMPORTER_ENTRY_SOURCE,
        source: "catalog_importer",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <Link
        href={CATALOG_IMPORTER_RETURN_PATH}
        className="text-muted-foreground inline-flex items-center gap-2 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to your catalog
      </Link>

      <div className="mt-8 max-w-xl">
        <form
          className="space-y-5"
          onSubmit={(event) => void startCheckout(event)}
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Start your Pro trial
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS} days free, then{" "}
              {membershipPriceDisplay.amount}
              {membershipPriceDisplay.interval}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="catalog-importer-checkout-email">
              Email address
            </Label>
            <Input
              id="catalog-importer-checkout-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!emailIsValid || createCheckout.isPending}
          >
            {createCheckout.isPending ? (
              <Spinner />
            ) : (
              <CreditCard className="size-4" />
            )}
            Continue to trial
          </Button>

          {createCheckout.error ? (
            <p className="text-destructive text-sm">
              Checkout did not open. Check your email and try again.
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
