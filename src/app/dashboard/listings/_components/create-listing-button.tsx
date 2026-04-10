"use client";

import { H3 } from "@/components/typography";
import { api } from "@/trpc/react";
import { APP_CONFIG, PRO_FEATURES } from "@/config/constants";
import { usePro } from "@/hooks/use-pro";
import { CheckoutButton } from "@/components/checkout-button";
import { TierLimitedCreateAction } from "@/app/dashboard/_components/tier-limited-create-action";
import { CreateListingDialog } from "./create-listing-dialog";

/**
 * Button component that launches the create listing dialog.
 * Handles subscription tier checks and upgrade prompts for free tier users.
 */
export function CreateListingButton() {
  const { isPro } = usePro();

  const { data: listingCount } = api.dashboardDb.listing.count.useQuery();

  return (
    <TierLimitedCreateAction
      buttonLabel="Create Listing"
      buttonTestId="create-listing-button"
      currentCount={listingCount}
      freeTierLimit={APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS}
      isPro={isPro}
      upgradeDialogTitle="Upgrade Required"
      upgradeDialogDescription={
        <>
          You&apos;ve reached the limit of{" "}
          {APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS} listings for free
          accounts.
        </>
      }
      upgradeDialogBody={
        <div className="space-y-4">
          <H3 className="text-center">Upgrade to Pro</H3>
          <p className="text-muted-foreground text-center text-sm">
            Upgrade to a Pro account to create unlimited listings and unlock
            other premium features.
          </p>
          <ul className="space-y-2 text-sm">
            {PRO_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.id} className="flex items-center">
                  <Icon className="mr-2 h-4 w-4" />
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
      renderCreateDialog={(onOpenChange) => (
        <CreateListingDialog onOpenChange={onOpenChange} />
      )}
    />
  );
}
