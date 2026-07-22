import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMembershipPriceDisplay } from "@/server/stripe/get-membership-price-display";
import { getOnboardingExampleCultivars } from "./anonymous-onboarding-example-cultivars";
import { AnonymousOnboardingPageClient } from "./anonymous-onboarding-layout";
import { OnboardingStatusPage } from "./onboarding-status-page";
import {
  CATALOG_IMPORTER_ENTRY_SOURCE,
  CATALOG_IMPORTER_RETURN_PATH,
} from "@/lib/catalog-importer-membership";
import { CatalogImporterCheckoutStart } from "./catalog-importer-checkout-start";

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

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    conversion_id?: string;
    entry?: string;
    return_to?: string;
  }>;
} = {}) {
  const [{ userId }, params] = await Promise.all([
    auth(),
    searchParams ??
      Promise.resolve<{
        conversion_id?: string;
        entry?: string;
        return_to?: string;
      }>({}),
  ]);
  if (userId) {
    return <SignedInOnboardingMessage />;
  }

  const membershipPriceDisplay = await getMembershipPriceDisplay();
  const isCatalogImporterCheckout =
    params.entry === CATALOG_IMPORTER_ENTRY_SOURCE &&
    params.return_to === CATALOG_IMPORTER_RETURN_PATH &&
    typeof params.conversion_id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      params.conversion_id,
    );
  if (isCatalogImporterCheckout) {
    return (
      <CatalogImporterCheckoutStart
        conversionId={params.conversion_id!}
        membershipPriceDisplay={membershipPriceDisplay}
      />
    );
  }

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
