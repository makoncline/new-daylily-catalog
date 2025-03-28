import { api } from "@/trpc/react";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { normalizeError, reportError } from "@/lib/error-utils";
import { useRouter } from "next/navigation";

export function usePro() {
  const router = useRouter();
  const { data: subscription, isLoading } =
    api.stripe.getSubscription.useQuery();
  const generateCheckout = api.stripe.generateCheckout.useMutation();

  const isPro = hasActiveSubscription(subscription?.status);

  const sendToCheckout = async () => {
    try {
      const { url } = await generateCheckout.mutateAsync();
      router.push(url);
    } catch (error) {
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
