"use client";

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { usePro } from "@/hooks/use-pro";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";
import { usePersistedSubscriptionQuery } from "@/hooks/use-persisted-subscription-query";

function StripeCheckoutButton() {
  const { sendToCheckout, isPending } = usePro();
  return (
    <DropdownMenuItem onClick={sendToCheckout} disabled={isPending}>
      <Sparkles className="mr-2 size-4" />
      {isPending ? "Loading…" : "Upgrade to Pro"}
    </DropdownMenuItem>
  );
}

function StripePortalButton() {
  const router = useRouter();
  const pushRoute = router.push.bind(router);
  const getPortalSession = api.stripe.getPortalSession.useMutation();

  const openStripePortal = async () => {
    try {
      const { url } = await getPortalSession.mutateAsync();

      // First go to success page to sync data
      pushRoute("/subscribe/success?redirect=" + encodeURIComponent(url));
    } catch (error) {
      console.error("Failed to get portal session", error);
    }
  };

  return (
    <DropdownMenuItem
      onClick={openStripePortal}
      disabled={getPortalSession.isPending}
    >
      <Sparkles className="mr-2 size-4" />
      {getPortalSession.isPending ? "Loading…" : "Manage Subscription"}
    </DropdownMenuItem>
  );
}

// Smart component that shows either checkout or portal button based on subscription status
export function StripeButton() {
  const subscriptionQuery = usePersistedSubscriptionQuery();
  const { data: subscription, isLoading } = subscriptionQuery;

  useEffect(() => {
    logDashboardTiming("stripe-button.subscription-state", {
      status: subscriptionQuery.status,
      fetchStatus: subscriptionQuery.fetchStatus,
      hasSubscription: subscription !== undefined,
      subscriptionStatus: subscription?.status ?? null,
    });
  }, [subscription, subscriptionQuery.fetchStatus, subscriptionQuery.status]);

  if (isLoading) {
    return (
      <DropdownMenuItem disabled>
        <Sparkles className="mr-2 size-4" />
        Loading…
      </DropdownMenuItem>
    );
  }

  if (hasActiveSubscription(subscription?.status)) {
    return <StripePortalButton />;
  }

  return <StripeCheckoutButton />;
}
