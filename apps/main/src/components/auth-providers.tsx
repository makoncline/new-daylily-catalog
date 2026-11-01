"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { PosthogUserIdentification } from "@/components/posthog-user-identification";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { TRPCReactProvider } from "@/trpc/react";

export function AuthProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl={SUBSCRIPTION_CONFIG.PATHS.DASHBOARD_SIGN_IN}
      signUpUrl={SUBSCRIPTION_CONFIG.PATHS.SELLER_SIGNUP}
    >
      <AuthenticatedTRPCProvider>
        {children}
        <PosthogUserIdentification />
      </AuthenticatedTRPCProvider>
    </ClerkProvider>
  );
}

function AuthenticatedTRPCProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken } = useAuth();
  return <TRPCReactProvider getToken={getToken}>{children}</TRPCReactProvider>;
}
