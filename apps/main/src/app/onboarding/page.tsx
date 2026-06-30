import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMembershipPriceDisplay } from "@/server/stripe/get-membership-price-display";
import { getOnboardingExampleCultivars } from "./anonymous-onboarding-example-cultivars";
import { AnonymousOnboardingPageClient } from "./anonymous-onboarding-layout";
import { OnboardingStatusPage } from "./onboarding-status-page";

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
  const exampleCultivars = await getOnboardingExampleCultivars();
  return (
    <AnonymousOnboardingPageClient
      exampleCultivars={exampleCultivars}
      membershipPriceDisplay={membershipPriceDisplay}
    />
  );
}

function SignedInOnboardingMessage() {
  return (
    <OnboardingStatusPage
      eyebrow="Signed in"
      title="You are already signed in."
      description="This setup is for new growers before they create an account. Your account is ready to manage from the dashboard."
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/dashboard">
              Go to dashboard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Return home</Link>
          </Button>
        </>
      }
    />
  );
}
