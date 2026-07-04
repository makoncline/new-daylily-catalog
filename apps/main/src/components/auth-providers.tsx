"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { PosthogUserIdentification } from "@/components/posthog-user-identification";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { TRPCReactProvider } from "@/trpc/react";

export function AuthProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl={SUBSCRIPTION_CONFIG.DASHBOARD_SIGN_IN_PATH}
      signUpUrl={SUBSCRIPTION_CONFIG.SELLER_SIGNUP_PATH}
    >
      <TRPCReactProvider>
        {children}
        <PosthogUserIdentification />
      </TRPCReactProvider>
    </ClerkProvider>
  );
}
