"use client";

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { hasActiveSubscription } from "@/server/stripe/subscription-utils";
import { usePro } from "@/hooks/use-pro";

export function StripeCheckoutButton() {
  const { sendToCheckout, isPending } = usePro();
  return (
    <DropdownMenuItem onClick={sendToCheckout} disabled={isPending}>
      <Sparkles className="mr-2 h-4 w-4" />
      {isPending ? "Loading..." : "Upgrade to Pro"}
    </DropdownMenuItem>
  );
}

export function StripePortalButton() {
  const router = useRouter();
  const getPortalSession = api.stripe.getPortalSession.useMutation();

  const handleClick = async () => {
    try {
      const { url } = await getPortalSession.mutateAsync();

      // First go to success page to sync data
      router.push("/subscribe/success?redirect=" + encodeURIComponent(url));
    } catch (error) {
      console.error("Failed to get portal session", error);
    }
  };

  return (
    <DropdownMenuItem
      onClick={handleClick}
      disabled={getPortalSession.isPending}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {getPortalSession.isPending ? "Loading..." : "Manage Subscription"}
    </DropdownMenuItem>
  );
}

// Smart component that shows either checkout or portal button based on subscription status
export function StripeButton() {
  const { data: subscription, isLoading } =
    api.stripe.getSubscription.useQuery();

  if (isLoading) {
    return (
      <DropdownMenuItem disabled>
        <Sparkles className="mr-2 h-4 w-4" />
        Loading...
      </DropdownMenuItem>
    );
  }

  if (hasActiveSubscription(subscription?.status)) {
    return <StripePortalButton />;
  }

  return <StripeCheckoutButton />;
}

// Shared upgrade function that can be used across components
export async function handleUpgrade() {
  const generateCheckout = api.stripe.generateCheckout.useMutation();

  try {
    const { url } = await generateCheckout.mutateAsync();
    return { success: true as const, url };
  } catch (error) {
    console.error("Failed to create checkout session", error);
    return {
      success: false as const,
      error: "Failed to start checkout. Please try again later.",
    };
  }
}
