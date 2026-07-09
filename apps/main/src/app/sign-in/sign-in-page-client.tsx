"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { Flower2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

const DASHBOARD_PATH = "/dashboard";

export function SignInPageClient() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (isLoaded && userId) {
      window.location.replace(DASHBOARD_PATH);
    }
  }, [isLoaded, userId]);

  return (
    <main className="bg-muted/30 flex min-h-svh flex-col items-center px-4 py-8">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <Flower2 className="text-primary size-4" aria-hidden="true" />
        <span>Daylily Catalog</span>
      </Link>

      {!isLoaded || userId ? null : (
        <SignIn
          routing="hash"
          forceRedirectUrl={DASHBOARD_PATH}
          fallbackRedirectUrl={DASHBOARD_PATH}
          withSignUp={false}
        />
      )}
    </main>
  );
}
