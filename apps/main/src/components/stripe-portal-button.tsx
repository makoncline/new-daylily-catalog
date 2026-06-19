"use client";

import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  hasActiveSubscription,
  needsBillingAttention,
} from "@/server/stripe/subscription-utils";
import { usePro } from "@/hooks/use-pro";
import { logDashboardTiming } from "@/app/dashboard/_lib/dashboard-timing";
import { usePersistedSubscriptionQuery } from "@/hooks/use-persisted-subscription-query";
import { useStripePortal } from "@/hooks/use-stripe-portal";
import { normalizeError, reportError } from "@/lib/error-utils";

function StripeCheckoutButton() {
  const { sendToCheckout, isPending } = usePro();
  return (
    <DropdownMenuItem onClick={sendToCheckout} disabled={isPending}>
      <Sparkles className="mr-2 size-4" />
      {isPending ? "Loading…" : "Upgrade to Pro"}
    </DropdownMenuItem>
  );
}

function StripePortalButton({
  label = "Manage Subscription",
}: {
  label?: string;
}) {
  const { isPending, openStripePortal } = useStripePortal();

  const handleOpenPortal = async () => {
    try {
      await openStripePortal();
    } catch (error) {
      reportError({
        error: normalizeError(error),
        context: { action: "stripeButtonOpenPortal" },
      });
    }
  };

  return (
    <DropdownMenuItem
      onClick={() => void handleOpenPortal()}
      disabled={isPending}
    >
      <Sparkles className="mr-2 size-4" />
      {isPending ? "Loading…" : label}
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

  if (needsBillingAttention(subscription?.status)) {
    return <StripePortalButton label="Update Billing" />;
  }

  if (hasActiveSubscription(subscription?.status)) {
    return <StripePortalButton />;
  }

  return <StripeCheckoutButton />;
}
