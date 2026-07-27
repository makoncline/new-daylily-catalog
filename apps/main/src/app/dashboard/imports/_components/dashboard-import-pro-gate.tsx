"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CatalogImporterDownloadOptions } from "@/app/(public)/catalog-importer/_components/catalog-importer-download-options";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { ProMembershipCard } from "@/app/dashboard/_components/stats-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";

const IMPORT_BUILDER_HREF = "/catalog-importer?returnTo=%2Fdashboard%2Fimports";

export function DashboardImportProGate({
  initialDraft,
}: {
  initialDraft: CatalogImporterDraft | null;
}) {
  const controller = useCatalogImporterWorkbench(initialDraft);
  const preparedListingCount =
    controller.matchedRows?.filter(
      (row) => row.rowKind === "listing" && row.outputState === "included",
    ).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Alert>
        <Sparkles />
        <AlertTitle>Catalog importing requires Pro</AlertTitle>
        <AlertDescription>
          {preparedListingCount > 0
            ? `${preparedListingCount.toLocaleString()} prepared ${preparedListingCount === 1 ? "listing is" : "listings are"} still available in this browser. Upgrade to Pro to create them in your catalog.`
            : "Upgrade to Pro to create listings from a prepared catalog import."}
        </AlertDescription>
      </Alert>

      <ProMembershipCard />

      {controller.matchedRows ? (
        <section
          aria-labelledby="dashboard-import-download-heading"
          className="flex flex-col gap-4"
        >
          <div>
            <h2
              id="dashboard-import-download-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Download your prepared files
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Downloading does not create listings or publish your catalog.
            </p>
          </div>

          {controller.downloadError ? (
            <Alert variant="destructive">
              <AlertTitle>Spreadsheet download did not finish</AlertTitle>
              <AlertDescription>
                {controller.downloadError} Your prepared import is still here.
              </AlertDescription>
            </Alert>
          ) : null}

          <CatalogImporterDownloadOptions controller={controller} />
        </section>
      ) : (
        <div>
          <Button asChild variant="outline">
            <Link href={IMPORT_BUILDER_HREF}>Build an import</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
