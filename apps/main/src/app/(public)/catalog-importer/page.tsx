import type { Metadata } from "next";
import { isCatalogImporterDiscoveryEnabled } from "@/config/feature-flags";
import { METADATA_CONFIG } from "@/config/constants";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
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

export default function CatalogImporterPage() {
  return (
    <div className="bg-background min-w-0 overflow-x-clip">
      <div className="mx-auto w-full max-w-[1440px] px-3 py-8 lg:px-8 lg:py-12">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free daylily catalog spreadsheet cleaner
          </h1>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg">
            Link registered cultivars, preview your catalog, and download a
            prepared copy with Daylily Catalog IDs.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            XLSX and CSV files are processed in your browser. Only cultivar
            names and saved IDs are sent for matching; your workbook is not
            saved.
          </p>
        </header>

        <CatalogImporterClient />
      </div>
    </div>
  );
}
