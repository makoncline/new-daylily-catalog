"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { CatalogImporterDownloadOptions } from "@/app/(public)/catalog-importer/_components/catalog-importer-download-options";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { ProMembershipAction } from "@/components/pro-membership-action";
import {
  ProUpgrade,
  ProUpgradeActions,
  ProUpgradeContent,
  ProUpgradeDescription,
  ProUpgradeDetails,
  ProUpgradeFeature,
  ProUpgradeFeatures,
  ProUpgradeHeader,
  ProUpgradeSubtitle,
  ProUpgradeTitle,
} from "@/components/pro-upgrade";
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
    <div className="flex flex-col gap-12">
      <ProUpgrade aria-labelledby="dashboard-import-pro-heading">
        <ProUpgradeHeader>
          <p className="text-xs font-semibold tracking-wide text-[#b7791f] uppercase">
            Pro required
          </p>
          <ProUpgradeTitle id="dashboard-import-pro-heading">
            {preparedListingCount > 0
              ? `Create ${preparedListingCount.toLocaleString()} prepared ${
                  preparedListingCount === 1 ? "listing" : "listings"
                }`
              : "Create listings from your import"}
          </ProUpgradeTitle>
          <ProUpgradeDescription>
            Your prepared import stays in this browser. Upgrade to Pro to add
            the listings to your catalog.
          </ProUpgradeDescription>
        </ProUpgradeHeader>
        <ProUpgradeContent>
          <ProUpgradeDetails>
            <ProUpgradeSubtitle>What Pro adds</ProUpgradeSubtitle>
            <ProUpgradeFeatures>
              {[
                "One public catalog link",
                "Listings with photos, prices, and availability",
                "Direct buyer inquiries",
                "Daylily Catalog discovery eligibility",
              ].map((feature) => (
                <ProUpgradeFeature key={feature}>
                  <Check className="text-muted-foreground size-4 shrink-0" />
                  {feature}
                </ProUpgradeFeature>
              ))}
            </ProUpgradeFeatures>
          </ProUpgradeDetails>
          <ProUpgradeActions className="gap-2">
            <ProMembershipAction className="w-full" />
          </ProUpgradeActions>
        </ProUpgradeContent>
      </ProUpgrade>

      {controller.matchedRows ? (
        <section
          aria-labelledby="dashboard-import-download-heading"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <h2
              id="dashboard-import-download-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Or download your files
            </h2>
            <p className="text-muted-foreground max-w-3xl text-sm leading-6">
              Both files can be uploaded again. Downloads contain values without
              spreadsheet formatting, formulas, drawings, or macros. Nothing is
              published.
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
        <div className="pt-2">
          <Button asChild variant="outline">
            <Link href={IMPORT_BUILDER_HREF}>Build an import</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
