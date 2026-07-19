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
    <div className="bg-background min-w-0">
      <div className="mx-auto w-full max-w-[1440px] px-3 py-8 lg:px-8 lg:py-12">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Turn your daylily spreadsheet into a catalog-ready collection
          </h1>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg">
            Upload an XLSX or CSV file. We’ll link registered cultivars, reveal
            a private catalog preview, and return a prepared copy.
          </p>
          <ul className="text-muted-foreground mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <li>Processed in your browser</li>
            <li>Complete workbook not saved to our database</li>
            <li>Nothing published</li>
          </ul>
          <details className="text-muted-foreground mt-3 text-sm">
            <summary className="text-foreground cursor-pointer font-medium">
              How matching works
            </summary>
            <p className="mt-2">
              Only cultivar names and saved Daylily Catalog IDs are sent for
              matching. Spreadsheet contents and private notes stay in this
              browser.
            </p>
          </details>
        </header>

        <CatalogImporterClient />
      </div>
    </div>
  );
}
