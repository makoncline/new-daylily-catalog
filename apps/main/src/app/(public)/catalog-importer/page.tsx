import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MainContent } from "@/app/(public)/_components/main-content";
import { isPublicCultivarSearchEnabled } from "@/config/feature-flags";
import { METADATA_CONFIG } from "@/config/constants";
import { CatalogImporterWorkbench } from "./_components/catalog-importer-workbench";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Free Daylily Catalog Spreadsheet Cleaner | ${METADATA_CONFIG.SITE_NAME}`,
  description:
    "Clean an XLSX or CSV daylily list, map listing columns, match registered cultivars, and download a normalized import-ready CSV without creating an account.",
};

export default function CatalogImporterPage() {
  if (!isPublicCultivarSearchEnabled()) {
    notFound();
  }

  return (
    <MainContent className="mx-0 mb-0 max-w-none space-y-0 p-0 md:p-0">
      <CatalogImporterWorkbench />
    </MainContent>
  );
}
