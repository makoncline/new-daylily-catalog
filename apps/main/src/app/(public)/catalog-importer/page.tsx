import type { Metadata } from "next";
import { isCatalogImporterDiscoveryEnabled } from "@/config/feature-flags";
import { METADATA_CONFIG } from "@/config/constants";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { getMembershipPriceDisplay } from "@/server/stripe/get-membership-price-display";
import { CatalogImporterClient } from "./_components/catalog-importer-client";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const baseUrl = getCanonicalBaseUrl();
  const title = `Free Daylily Catalog Spreadsheet Cleaner | ${METADATA_CONFIG.SITE_NAME}`;
  const description =
    "Clean a daylily spreadsheet, match registered cultivars, preview the catalog, and download a prepared copy with Daylily Catalog IDs.";

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
          Build your daylily catalog
        </h1>
        <p
          data-importer-upload-copy
          className="text-muted-foreground mt-2 text-base sm:text-lg"
        >
          Upload an XLSX or CSV file to match cultivars, preview your catalog,
          and prepare a clean copy.
        </p>
      </header>

      <CatalogImporterClient
        membershipPriceDisplay={membershipPriceDisplay}
        viewerState="anonymous"
      />
    </div>
  );
}
