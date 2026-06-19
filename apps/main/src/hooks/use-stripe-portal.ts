"use client";

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

export function useStripePortal() {
  const router = useRouter();
  const getPortalSession = api.stripe.getPortalSession.useMutation();

  const openStripePortal = async () => {
    const { url } = await getPortalSession.mutateAsync();
    router.push(url);
  };

  return {
    isPending: getPortalSession.isPending,
    openStripePortal,
  } as const;
}
