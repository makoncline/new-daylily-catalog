import type { Metadata } from "next";
import { db } from "@/server/db";
import { getAnonymousOnboardingCheckoutStatus } from "@/server/onboarding/anonymous-onboarding-service";
import { CheckoutSuccessPageClient } from "./checkout-success-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finish Your Account | Daylily Catalog",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function OnboardingCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const status = sessionId
    ? await getAnonymousOnboardingCheckoutStatus(db, sessionId).catch(
        (error: unknown) => {
          console.error("Unable to load onboarding checkout status", error);
          return null;
        },
      )
    : null;

  return <CheckoutSuccessPageClient status={status} />;
}
