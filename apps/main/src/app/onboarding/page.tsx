import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMembershipPriceDisplay } from "@/server/stripe/get-membership-price-display";
import { AnonymousOnboardingPageClient } from "./anonymous-onboarding-layout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set Up Your Catalog | Daylily Catalog",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (userId) {
    return <SignedInOnboardingMessage />;
  }

  const membershipPriceDisplay = await getMembershipPriceDisplay();
  return (
    <AnonymousOnboardingPageClient
      membershipPriceDisplay={membershipPriceDisplay}
    />
  );
}

function SignedInOnboardingMessage() {
  return (
    <div className="bg-muted/20 min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-3xl items-center px-4 py-10">
        <div className="bg-card w-full space-y-6 rounded-lg border p-8 shadow-sm">
          <div className="space-y-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <CheckCircle2 className="size-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              You are already signed in.
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              This setup is for new growers before they create an account. Your
              account is ready to manage from the dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Go to dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/">Return home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
