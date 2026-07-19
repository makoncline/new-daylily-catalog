import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { isCatalogImporterDiscoveryEnabled } from "@/config/feature-flags";
import { METADATA_CONFIG } from "@/config/constants";
import { getCanonicalBaseUrl } from "@/lib/utils/getBaseUrl";
import { replicaDb } from "@/server/db";
import { getProUserIdSet } from "@/server/db/getProUserIdSet";
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

export async function shouldShowCatalogImporterMembershipPrompts() {
  const { userId } = await auth();
  if (!userId) {
    return true;
  }

  try {
    const user = await replicaDb.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, stripeCustomerId: true },
    });
    if (!user) {
      return true;
    }

    return !(await getProUserIdSet([user], replicaDb)).has(user.id);
  } catch {
    // A membership lookup must never block this browser-local tool or show an
    // acquisition prompt to a member whose status could not be confirmed.
    return false;
  }
}

export default async function CatalogImporterPage() {
  const showMembershipPrompts =
    await shouldShowCatalogImporterMembershipPrompts();

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
          <p className="text-muted-foreground mt-4 text-sm">
            Your workbook stays in this browser; only cultivar names and saved
            Daylily Catalog IDs are sent for matching. Nothing is published.
          </p>
        </header>

        <CatalogImporterClient showMembershipPrompts={showMembershipPrompts} />
      </div>
    </div>
  );
}
