"use client";

import { useEffect } from "react";
import { H3 } from "@/components/typography";
import { APP_CONFIG, PRO_FEATURES } from "@/config/constants";
import { usePro } from "@/hooks/use-pro";
import { CheckoutButton } from "@/components/checkout-button";
import { TierLimitedCreateAction } from "@/app/dashboard/_components/tier-limited-create-action";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";

import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { useDashboardDb } from "@/app/dashboard/_components/dashboard-db-provider";

export function CreateListingButton({ onCreate }: { onCreate: () => void }) {
  const { listingsCollection } = useDashboardDb();
  const { isPro, isLoading: isSubscriptionLoading } = usePro();
  const listingsQuery = useLiveSuspenseQuery({
    query: (q) => q.from({ listing: listingsCollection }),
  });
  const listingCount = listingsQuery.data.length;

  useEffect(() => {
    logDashboardTiming("create-listing-button.count-state", {
      listingCount,
      isPro,
    });
  }, [isPro, listingCount]);

  return (
    <TierLimitedCreateAction
      buttonLabel="Create Listing"
      buttonTestId="create-listing-button"
      currentCount={listingCount}
      disabled={isSubscriptionLoading}
      freeTierLimit={APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS}
      isPro={isPro}
      onCreate={onCreate}
      upgradeDialogTitle="Upgrade Required"
      upgradeDialogDescription={
        <>
          You&apos;ve reached the limit of{" "}
          {APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS} listings for free
          accounts.
        </>
      }
      upgradeDialogBody={
        <div className="flex flex-col gap-4">
          <H3 className="text-center">
            {SUBSCRIPTION_CONFIG.COPY.CTA.UPGRADE_TO_PRO}
          </H3>
          <p className="text-muted-foreground text-center text-sm">
            Upgrade to a Pro account to create unlimited listings and unlock
            other premium features.
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {PRO_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.id} className="flex items-center">
                  <Icon className="mr-2 size-4" />
                  {feature.text}
                </li>
              );
            })}
          </ul>
          <div className="flex justify-center">
            <CheckoutButton />
          </div>
        </div>
      }
    />
  );
}
