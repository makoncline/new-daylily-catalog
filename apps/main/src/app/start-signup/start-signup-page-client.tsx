"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { Flower2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

const ONBOARDING_PATH = SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH;

export function StartSignupPageClient() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (isLoaded && userId) {
      window.location.replace(ONBOARDING_PATH);
    }
  }, [isLoaded, userId]);

  return (
    <main className="flex min-h-svh flex-col items-center bg-muted/30 px-4 py-8">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Flower2 className="size-4 text-primary" aria-hidden="true" />
        <span>Daylily Catalog</span>
      </Link>

      {!isLoaded || userId ? null : (
        <SignUp
          routing="hash"
          forceRedirectUrl={ONBOARDING_PATH}
          fallbackRedirectUrl={ONBOARDING_PATH}
          signInForceRedirectUrl={ONBOARDING_PATH}
          signInFallbackRedirectUrl={ONBOARDING_PATH}
        />
      )}
    </main>
  );
}
