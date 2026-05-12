import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { normalizeError, reportError } from "@/lib/error-utils";
import { useRouter } from "next/navigation";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { api } from "@/trpc/react";
import { usePersistedSubscriptionQuery } from "@/hooks/use-persisted-subscription-query";

export function usePro() {
  const router = useRouter();
  const { data: subscription, isLoading } = usePersistedSubscriptionQuery();
  const generateCheckout = api.stripe.generateCheckout.useMutation();

  const subscriptionStatus = subscription?.status ?? null;
  const isPro = hasActiveSubscription(subscription?.status);
  const isTrialing = subscriptionStatus === "trialing";

  const sendToCheckout = async () => {
    capturePosthogEvent("checkout_started", { source: "use-pro" });

    try {
      const { url } = await generateCheckout.mutateAsync();
      capturePosthogEvent("checkout_redirect_ready", { source: "use-pro" });
      router.push(url);
    } catch (error) {
      capturePosthogEvent("checkout_failed", { source: "use-pro" });
      reportError({
        error: normalizeError(error),
        context: { action: "sendToCheckout" },
      });
    }
  };

  return {
    isPro,
    isTrialing,
    subscriptionStatus,
    isLoading,
    isPending: generateCheckout.isPending,
    sendToCheckout,
  } as const;
}
