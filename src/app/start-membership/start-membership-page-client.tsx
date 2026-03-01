"use client";

import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { PRO_FEATURES } from "@/config/constants";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

interface StartMembershipPageClientProps {
  priceDisplay: {
    amount: string;
    interval: string;
    monthlyEquivalent: string | null;
  } | null;
}

export function StartMembershipPageClient({
  priceDisplay,
}: StartMembershipPageClientProps) {
  return (
    <div className="bg-muted/20 min-h-svh p-4 md:p-10" data-testid="start-membership-page">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,560px)]">
          <div className="space-y-8 py-2 md:py-6">
            <div className="space-y-4">
              <h1 className="text-5xl leading-[0.92] font-bold tracking-tight sm:text-6xl md:text-7xl">
                <span className="block">Get found by daylily buyers.</span>
                <span className="block">Turn your catalog into a storefront.</span>
              </h1>
              <p className="text-muted-foreground max-w-xl text-2xl leading-tight md:text-3xl">
                Publish a clean catalog under your garden name and appear in
                seller browsing, search, and cultivar pages where collectors
                research varieties.
              </p>
            </div>

            <div className="space-y-4">
              <CheckoutButton
                size="lg"
                variant="default"
                className="h-12 w-full text-base font-semibold sm:w-auto sm:px-8"
                data-testid="start-membership-checkout"
              >
                Start {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free trial
              </CheckoutButton>

              <p className="text-muted-foreground text-sm">
                Then{" "}
                {priceDisplay
                  ? `${priceDisplay.amount}${priceDisplay.interval}${
                      priceDisplay.monthlyEquivalent
                        ? ` (${priceDisplay.monthlyEquivalent}/mo)`
                        : ""
                    }`
                  : "standard plan pricing at checkout"}
                . Cancel anytime.
              </p>

              <Link
                href="/dashboard"
                className="text-muted-foreground inline-block text-sm underline"
                data-testid="start-membership-continue"
              >
                Keep unlisted
              </Link>
            </div>
          </div>

          <div className="bg-card rounded-[2rem] border p-6 shadow-sm md:p-10">
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              Pro plan
            </p>

            {priceDisplay ? (
              <p
                className="mt-4 flex items-end gap-1 leading-none"
                data-testid="start-membership-price"
              >
                <span className="text-6xl font-bold tracking-tight md:text-7xl">
                  {priceDisplay.amount}
                </span>
                <span className="text-4xl font-semibold tracking-tight md:text-5xl">
                  {priceDisplay.interval}
                </span>
              </p>
            ) : (
              <p
                className="mt-4 text-4xl leading-tight font-semibold tracking-tight md:text-5xl"
                data-testid="start-membership-price"
              >
                Pricing shown at checkout
              </p>
            )}

            <p className="text-muted-foreground mt-3 text-lg">
              Secure payments powered by Stripe.
            </p>

            {priceDisplay?.monthlyEquivalent ? (
              <p className="text-muted-foreground mt-1 text-base">
                {priceDisplay.monthlyEquivalent}/mo billed annually.
              </p>
            ) : null}

            <ul className="mt-8 space-y-5 text-2xl leading-tight">
              {PRO_FEATURES.map((feature) => {
                const Icon = feature.icon;

                return (
                  <li key={feature.id} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{feature.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
