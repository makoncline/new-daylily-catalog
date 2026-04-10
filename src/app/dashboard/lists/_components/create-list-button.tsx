"use client";

import { H3 } from "@/components/typography";
import { api } from "@/trpc/react";
import { APP_CONFIG, PRO_FEATURES } from "@/config/constants";
import { usePro } from "@/hooks/use-pro";
import { CheckoutButton } from "@/components/checkout-button";
import { TierLimitedCreateAction } from "@/app/dashboard/_components/tier-limited-create-action";
import { CreateListDialog } from "./create-list-dialog";

export function CreateListButton() {
  const { isPro } = usePro();

  const { data: listCount } = api.dashboardDb.list.count.useQuery();

  return (
    <TierLimitedCreateAction
      buttonLabel="Create List"
      currentCount={listCount}
      freeTierLimit={APP_CONFIG.LIST.FREE_TIER_MAX_LISTS}
      isPro={isPro}
      upgradeDialogClassName="sm:max-w-[500px]"
      upgradeDialogTitle="Upgrade to Pro"
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
          </div>

          <CheckoutButton size="lg" />
        </div>
      }
      renderCreateDialog={(onOpenChange) => (
        <CreateListDialog onOpenChange={onOpenChange} />
      )}
    />
  );
}
