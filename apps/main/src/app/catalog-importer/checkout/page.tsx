import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SUBSCRIPTION_CONFIG } from "@/config/subscription-config";
import { parseCatalogImporterCheckoutSource } from "@/lib/catalog-importer-membership";
import { getMembershipPriceDisplay } from "@/server/stripe/get-membership-price-display";
import { CatalogImporterCheckoutStart } from "./catalog-importer-checkout-start";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: SUBSCRIPTION_CONFIG.COPY.CHECKOUT.METADATA_TITLE,
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

export default async function CatalogImporterCheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{
    conversion_id?: string | string[];
    entry?: string | string[];
    return_to?: string | string[];
  }>;
} = {}) {
  const [{ userId }, params] = await Promise.all([
    auth(),
    searchParams ??
      Promise.resolve<{
        conversion_id?: string | string[];
        entry?: string | string[];
        return_to?: string | string[];
      }>({}),
  ]);
  if (userId) {
    redirect("/catalog-importer");
  }

  const checkoutSource = parseCatalogImporterCheckoutSource(params);
  if (!checkoutSource) {
    redirect("/catalog-importer");
  }

  const membershipPriceDisplay = await getMembershipPriceDisplay();
  return (
    <CatalogImporterCheckoutStart
      checkoutSource={checkoutSource}
      membershipPriceDisplay={membershipPriceDisplay}
    />
  );
}
