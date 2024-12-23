"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useAuth } from "@clerk/nextjs";

export default function StripePortalButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const { data: userData } = api.stripe.getSubscription.useQuery(undefined, {
    enabled: !!userId,
  });
  const createPortalSession = api.stripe.createPortalSession.useMutation();
  const getSubscriptionLink = api.stripe.getSubscriptionLink.useMutation();

  // Don't show anything while auth is loading or if no user ID
  if (!isAuthLoaded || !userId) {
    return null;
  }

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (userData?.subscription) {
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

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading
          ? "Loading..."
          : userData?.subscription
            ? "Manage Subscription"
            : "Subscribe Now"}
      </button>
      {error && <p className="mt-2 text-red-500">{error}</p>}
    </div>
  );
}
