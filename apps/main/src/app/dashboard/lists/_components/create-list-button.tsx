"use client";

import { H3 } from "@/components/typography";
import { APP_CONFIG, PRO_FEATURES } from "@/config/constants";
import { CheckoutButton } from "@/components/checkout-button";
import { TierLimitedCreateAction } from "@/app/dashboard/_components/tier-limited-create-action";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { useListEligibility } from "../_hooks/use-list-eligibility";

export function CreateListButton({ onCreate }: { onCreate: () => void }) {
  const { isEligibilityLoading, isPro, listCount } = useListEligibility();

  return (
    <TierLimitedCreateAction
      buttonLabel="Create List"
      currentCount={listCount}
      disabled={isEligibilityLoading}
      freeTierLimit={APP_CONFIG.LIST.FREE_TIER_MAX_LISTS}
      isPro={isPro}
      onCreate={onCreate}
      upgradeDialogClassName="sm:max-w-lg"
      upgradeDialogTitle={SUBSCRIPTION_CONFIG.COPY.CTA.UPGRADE_TO_PRO}
      upgradeDialogDescription={
        <>
          You&apos;ve reached the free tier limit of{" "}
          {APP_CONFIG.LIST.FREE_TIER_MAX_LISTS} list. Upgrade to Pro for
          unlimited lists and more features.
        </>
      }
      upgradeDialogBody={
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <H3 className="text-xl">Pro Features</H3>
            <ul className="flex flex-col gap-2 text-sm">
              {PRO_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li key={feature.id} className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {feature.text}
                  </li>
                );
              })}
            </ul>
          </div>

          <CheckoutButton size="lg" />
        </div>
      }
    />
  );
}
