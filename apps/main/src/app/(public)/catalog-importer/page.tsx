import type { Metadata } from "next";
import { isCatalogImporterDiscoveryEnabled } from "@/config/feature-flags";
import { METADATA_CONFIG } from "@/config/constants";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getMembershipPriceDisplay } from "@/server/stripe/get-membership-price-display";
import { CatalogImporterClient } from "./_components/catalog-importer-client";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const baseUrl = getCanonicalBaseUrl();
  const title = `Daylily Catalog Import Builder | ${METADATA_CONFIG.SITE_NAME}`;
  const description =
    "Turn a daylily spreadsheet into a private, buyer-friendly catalog preview with matched cultivars, reference photos, filters, and prepared files.";

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/catalog-importer` },
    robots: isCatalogImporterDiscoveryEnabled()
      ? undefined
      : {
          follow: false,
          index: false,
        },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${baseUrl}/catalog-importer`,
    },
  };
}

export default async function CatalogImporterPage() {
  const membershipPriceDisplay = await getMembershipPriceDisplay().catch(
    () => null,
  );

  return (
    <div className="w-full px-3 py-8 lg:px-8 lg:py-12">
      <header className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Turn the catalog you already have into one buyers can browse
        </h1>
        <p
          data-importer-upload-copy
          className="text-muted-foreground mt-2 text-base sm:text-lg"
        >
          Upload a spreadsheet, add listings manually, or try a sample. We will
          match registered cultivars, add reference photos and details, and
          build a private catalog preview. Nothing is published.
        </p>
      </header>

      <CatalogImporterClient membershipPriceDisplay={membershipPriceDisplay} />
    </div>
  );
}
