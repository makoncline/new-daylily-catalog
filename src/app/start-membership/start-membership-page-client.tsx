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

export function StartMembershipPageClient() {
  return (
    <div className="bg-muted/20 flex min-h-svh items-center justify-center p-4 md:p-10">
      <div
        className="bg-card w-full max-w-2xl rounded-[2rem] border p-6 shadow-sm md:max-w-5xl md:p-10"
        data-testid="start-membership-page"
      >
        <div className="flex flex-col gap-10 md:grid md:grid-cols-[minmax(0,1fr)_17rem] md:gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="max-w-lg text-6xl leading-tight font-bold tracking-tight md:text-7xl">
                Start your membership
              </h1>
              <p className="text-muted-foreground max-w-xl text-2xl leading-tight md:text-3xl">
                Start Pro now to unlock the full catalog experience from day
                one.
              </p>
            </div>

            <div className="space-y-5">
              <h2 className="text-5xl font-semibold tracking-tight md:text-4xl">
                What Pro unlocks
              </h2>
              <ul className="space-y-4 text-xl leading-tight md:text-xl">
                {PRO_UNLOCKS.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <li key={feature.id} className="flex items-start gap-3">
                      <Icon
                        className="mt-0.5 h-5 w-5 shrink-0 md:mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{feature.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="space-y-5 md:flex md:min-h-full md:flex-col md:justify-end">
            <CheckoutButton
              size="lg"
              className="h-14 w-full text-3xl font-semibold md:text-xl"
              data-testid="start-membership-checkout"
            >
              Start {SUBSCRIPTION_CONFIG.FREE_TRIAL_DAYS}-day free trial
            </CheckoutButton>
            <p className="text-muted-foreground text-2xl leading-tight md:text-lg">
              Secure payments powered by Stripe.
            </p>
            <Link
              href="/dashboard"
              className="text-muted-foreground text-sm underline"
              data-testid="start-membership-continue"
            >
              Continue for now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
