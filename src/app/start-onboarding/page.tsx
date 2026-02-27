import type { Metadata } from "next";
import { StartOnboardingPageClient } from "./start-onboarding-page-client";

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

export default function StartOnboardingPage() {
  return <StartOnboardingPageClient />;
}
