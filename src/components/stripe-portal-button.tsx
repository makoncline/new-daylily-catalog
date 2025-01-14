"use client";

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function StripeCheckoutButton() {
  const router = useRouter();
  const generateCheckout = api.stripe.generateCheckout.useMutation();

  const handleClick = async () => {
    try {
      const { url } = await generateCheckout.mutateAsync();
      router.push(url);
    } catch (error) {
      console.error("Failed to create checkout session", error);
    }
  };

  return (
    <DropdownMenuItem
      onClick={handleClick}
      disabled={generateCheckout.isPending}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {generateCheckout.isPending ? "Loading..." : "Upgrade to Pro"}
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

  const hasActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";

  if (hasActiveSubscription) {
    return <StripePortalButton />;
  }

  return <StripeCheckoutButton />;
}
