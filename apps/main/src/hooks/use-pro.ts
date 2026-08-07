import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { toast } from "sonner";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { usePersistedSubscriptionQuery } from "@/hooks/use-persisted-subscription-query";
import { api } from "@/trpc/react";

export function usePro() {
  const { data: subscription, isLoading } = usePersistedSubscriptionQuery();
  const createCheckout = api.stripe.generateCheckout.useMutation();

  const subscriptionStatus = subscription?.status ?? null;
  const isPro = hasActiveSubscription(subscription?.status);
  const isTrialing = subscriptionStatus === "trialing";

  const sendToCheckout = async () => {
    const analyticsProperties = { source: "dashboard" };
    capturePosthogEvent("checkout_started", analyticsProperties);
    try {
      const checkout = await createCheckout.mutateAsync();
      capturePosthogEvent("checkout_redirect_ready", analyticsProperties);
      window.location.assign(checkout.url);
    } catch {
      capturePosthogEvent("checkout_failed", analyticsProperties);
      toast.error("Checkout did not open. Try again.");
    }
  };

  return {
    isPro,
    isTrialing,
    subscriptionStatus,
    isLoading,
    isPending: createCheckout.isPending,
    sendToCheckout,
  } as const;
}
