"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import { Flower2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";

function AuthErrorContent() {
  const { isLoaded, userId } = useAuth();
  const searchParams = useSearchParams();
  const getSearchParam = searchParams.get.bind(searchParams);
  const returnTo = getSearchParam("returnTo") ?? "/dashboard";
  const isSignedIn = isLoaded && Boolean(userId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="mb-6 flex items-center gap-2">
        <Flower2 className="size-8" />
        <Link href="/" className="text-xl font-semibold">
          Daylily Catalog
        </Link>
      </div>

      <div className="bg-card mx-auto max-w-md space-y-6 rounded-lg border p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">
          {isSignedIn ? "Something Went Wrong" : "Authentication Required"}
        </h1>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            {isSignedIn
              ? "You are signed in, but this page could not be opened."
              : "You need to be signed in to access this page. Your session may have expired."}
          </p>
          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-center">
            {isSignedIn ? (
              <Button asChild size="lg">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <SignInButton
                  mode="modal"
                  forceRedirectUrl={returnTo}
                  signUpForceRedirectUrl={
                    SUBSCRIPTION_CONFIG.NEW_USER_ONBOARDING_PATH
                  }
                >
                  Sign In
                </SignInButton>
              </Button>
            )}
            <Button variant="outline" asChild size="lg">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
          {isSignedIn ? (
            <SignOutButton>
              <Button className="text-muted-foreground" size="sm" variant="ghost">
                Sign out
              </Button>
            </SignOutButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AuthErrorPageClient() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
