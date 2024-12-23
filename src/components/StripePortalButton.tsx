"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useAuth } from "@clerk/nextjs";
import type Stripe from "stripe";

type SubscriptionStatus = Stripe.Subscription.Status;

const getMembershipStatus = (status: SubscriptionStatus | undefined) => {
  if (!status) return false;

  switch (status) {
    case "active":
    case "trialing":
      return true;
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "past_due":
    case "paused":
    case "unpaid":
      return false;
    default:
      return false;
  }
};

export default function StripePortalButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const { data: userData, isLoading: isSubscriptionLoading } =
    api.stripe.getSubscription.useQuery(undefined, {
      enabled: !!userId,
      retry: false,
    });
  const createPortalSession = api.stripe.createPortalSession.useMutation();
  const getSubscriptionLink = api.stripe.getSubscriptionLink.useMutation();

  // Don't show anything while auth is loading or if no user ID
  if (!isAuthLoaded || !userId) {
    return null;
  }

  // Show loading state while subscription data is being fetched
  if (isSubscriptionLoading) {
    return (
      <button
        disabled
        className="rounded bg-blue-500 px-4 py-2 text-white opacity-50"
      >
        Loading...
      </button>
    );
  }

  const hasActiveSubscription = getMembershipStatus(
    userData?.subscription?.status as SubscriptionStatus | undefined,
  );

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (hasActiveSubscription) {
        const { url } = await createPortalSession.mutateAsync();
        if (url) {
          window.location.href = url;
        }
      } else {
        const { url } = await getSubscriptionLink.mutateAsync();
        if (url) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading
          ? "Loading..."
          : hasActiveSubscription
            ? "Manage Subscription"
            : "Subscribe Now"}
      </button>
      {error && <p className="mt-2 text-red-500">{error}</p>}
    </div>
  );
}
