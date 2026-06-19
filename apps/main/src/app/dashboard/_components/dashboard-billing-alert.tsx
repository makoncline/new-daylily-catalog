"use client";

import { AlertTriangle, CreditCard } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePersistedSubscriptionQuery } from "@/hooks/use-persisted-subscription-query";
import { needsBillingAttention } from "@/server/stripe/subscription-utils";
import { useStripePortal } from "@/hooks/use-stripe-portal";
import { normalizeError, reportError } from "@/lib/error-utils";

export function DashboardBillingAlert() {
  const { data: subscription } = usePersistedSubscriptionQuery();
  const { isPending, openStripePortal } = useStripePortal();

  if (!needsBillingAttention(subscription?.status)) {
    return null;
  }

  const handleUpdateBilling = async () => {
    try {
      await openStripePortal();
    } catch (error) {
      reportError({
        error: normalizeError(error),
        context: { action: "dashboardBillingAlertOpenPortal" },
      });
    }
  };

  return (
    <Alert variant="destructive" data-testid="dashboard-billing-alert">
      <AlertTriangle className="size-4" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AlertTitle>Payment update needed</AlertTitle>
          <AlertDescription>
            Your subscription payment needs attention. Update billing to keep
            your catalog and Pro features active.
          </AlertDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => void handleUpdateBilling()}
          disabled={isPending}
        >
          <CreditCard className="size-4" />
          {isPending ? "Loading…" : "Update billing"}
        </Button>
      </div>
    </Alert>
  );
}
