"use client";

import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";
import { Flower2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo") ?? "/dashboard";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="mb-6 flex items-center gap-2">
        <Flower2 className="h-8 w-8" />
        <Link href="/" className="text-xl font-semibold">
          Daylily Catalog
        </Link>
      </div>

      <div className="mx-auto max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Authentication Required</h1>

        <div className="space-y-4">
          <p className="text-muted-foreground">
            You need to be signed in to access this page. Your session may have
            expired.
          </p>
          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <SignInButton
                mode="modal"
                forceRedirectUrl={returnTo}
                signUpForceRedirectUrl={returnTo}
              >
                Sign In
              </SignInButton>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
