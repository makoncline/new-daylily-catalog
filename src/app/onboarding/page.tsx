import type { Metadata } from "next";
import { Suspense } from "react";
import { StartOnboardingPageClient } from "../start-onboarding/start-onboarding-page-client";
import { getMembershipPriceDisplay } from "@/server/stripe/get-membership-price-display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set Up Your Catalog",
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
  const membershipPriceDisplay = await getMembershipPriceDisplay();
  return (
    <Suspense>
      <StartOnboardingPageClient
        membershipPriceDisplay={membershipPriceDisplay}
      />
    </Suspense>
  );
}
