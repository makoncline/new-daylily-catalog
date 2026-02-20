import { api } from "@/trpc/react";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { normalizeError, reportError } from "@/lib/error-utils";
import { useRouter } from "next/navigation";
import { capturePosthogEvent } from "@/lib/analytics/posthog";

export function usePro() {
  const router = useRouter();
  const { data: subscription, isLoading } =
    api.stripe.getSubscription.useQuery();
  const generateCheckout = api.stripe.generateCheckout.useMutation();

  const isPro = hasActiveSubscription(subscription?.status);

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
    isLoading,
    isPending: generateCheckout.isPending,
    sendToCheckout,
  } as const;
}
