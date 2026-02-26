"use client";

import Link from "next/link";
import {
  ExternalLink,
  HandHeart,
  ImageIcon,
  ListChecks,
  Package,
} from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

interface StartMembershipPageClientProps {
  priceDisplay: {
    amount: string;
    interval: string;
  } | null;
}

const PRO_UNLOCKS = [
  {
    id: "custom-url",
    icon: ExternalLink,
    text: "Custom URL: daylilycatalog.com/your-garden-name",
  },
  {
    id: "unlimited",
    icon: Package,
    text: "Unlimited listings, lists, and images",
  },
  {
    id: "catalog-page",
    icon: ListChecks,
    text: "Catalog shown on the public catalogs page",
  },
  {
    id: "cultivar-page",
    icon: ImageIcon,
    text: "Listings shown on public cultivar pages",
  },
  {
    id: "support",
    icon: HandHeart,
    text: "Get priority support during peak season.",
  },
] as const;

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
                <span className="block">One plan,</span>
                <span className="block">Unlimited access</span>
              </h1>
              <p className="text-muted-foreground max-w-xl text-2xl leading-tight md:text-3xl">
                Start Pro now to unlock the full catalog experience from day one.
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
                  ? `${priceDisplay.amount}${priceDisplay.interval}`
                  : "standard plan pricing at checkout"}
                . Cancel anytime.
              </p>

              <Link
                href="/dashboard"
                className="text-muted-foreground inline-block text-sm underline"
                data-testid="start-membership-continue"
              >
                Continue for now
              </Link>
            </div>
          </div>

          <div className="bg-card rounded-[2rem] border p-6 shadow-sm md:p-10">
            <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              Pro membership
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

            <ul className="mt-8 space-y-5 text-2xl leading-tight">
              {PRO_UNLOCKS.map((feature) => {
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
