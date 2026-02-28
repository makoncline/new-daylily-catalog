import type { Metadata } from "next";
import { StartMembershipPageClient } from "./start-membership-page-client";
import { getMembershipPriceDisplay } from "@/server/stripe/get-membership-price-display";

export const metadata: Metadata = {
  title: "Start Your Membership",
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

export default async function StartMembershipPage() {
  const priceDisplay = await getMembershipPriceDisplay();

  return <StartMembershipPageClient priceDisplay={priceDisplay} />;
}
