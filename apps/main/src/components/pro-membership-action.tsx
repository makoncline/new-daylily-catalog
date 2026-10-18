"use client";

import { CreditCard } from "lucide-react";
import { CheckoutButton } from "@/components/checkout-button";
import { ProMembershipFeedback } from "@/components/pro-membership-feedback";
import { Button } from "@/components/ui/button";
import { usePro } from "@/hooks/use-pro";
import { useStripePortal } from "@/hooks/use-stripe-portal";
import { normalizeError, reportError } from "@/lib/error-utils";
import { needsBillingAttention } from "@/server/stripe/subscription-utils";

export function ProMembershipAction({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { isPro, isLoading, subscriptionStatus } = usePro();
  const { isPending: isPortalPending, openStripePortal } = useStripePortal();

  if (isLoading || isPro) {
    return null;
  }

  if (!needsBillingAttention(subscriptionStatus)) {
    return (
      <div className="flex flex-col items-center gap-1">
        <CheckoutButton
          className={className}
          data-testid="dashboard-upgrade-to-pro"
          size="lg"
        >
          {children}
        </CheckoutButton>
        <ProMembershipFeedback />
      </div>
    );
  }

  const updateBilling = async () => {
    try {
      await openStripePortal();
    } catch (error) {
      reportError({
        error: normalizeError(error),
        context: { action: "proMembershipActionOpenPortal" },
      });
    }
  };

  return (
    <Button
      className={className}
      data-testid="dashboard-update-billing"
      disabled={isPortalPending}
      onClick={() => void updateBilling()}
      size="lg"
      type="button"
      variant="destructive"
    >
      <CreditCard data-icon="inline-start" />
      {isPortalPending ? "Loading…" : "Update billing"}
    </Button>
  );
}
