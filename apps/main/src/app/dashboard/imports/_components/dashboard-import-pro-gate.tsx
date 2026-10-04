"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { CatalogImporterDownloadOptions } from "@/app/(public)/catalog-importer/_components/catalog-importer-download-options";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import { ProMembershipAction } from "@/components/pro-membership-action";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import { IMPORT_BUILDER_HREF } from "./dashboard-import-config";

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
    <div
      className="flex flex-col gap-12"
      data-ph-capture-attribute-flow="catalog-importer"
      data-ph-capture-attribute-import_id={initialDraft?.projectId}
      data-ph-capture-attribute-step="dashboard-pro-gate"
    >
      <section
        className="flex flex-col gap-6"
        aria-labelledby="dashboard-import-pro-heading"
      >
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">Pro required</p>
          <h2
            className="text-xl font-semibold tracking-tight"
            id="dashboard-import-pro-heading"
          >
            {preparedListingCount > 0
              ? `Create ${preparedListingCount.toLocaleString()} prepared ${
                  preparedListingCount === 1 ? "listing" : "listings"
                }`
              : "Create listings from your import"}
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-6">
            Your prepared import stays in this browser. Upgrade to Pro to add
            the listings to your catalog.
          </p>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3">
            <h3 className="font-medium">What Pro adds</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {[
                "One public catalog link",
                "Listings with photos, prices, and availability",
                "Direct buyer inquiries",
                "Daylily Catalog discovery eligibility",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="text-muted-foreground size-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="self-start"
            data-ph-capture-attribute-action="start-pro-checkout"
          >
            <ProMembershipAction />
          </div>
        </div>
      </section>

      {controller.matchedRows ? (
        <section
          aria-labelledby="dashboard-import-download-heading"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <h2
              id="dashboard-import-download-heading"
              className="text-xl font-semibold tracking-tight"
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

          <CatalogImporterDownloadOptions controller={controller} stacked />
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
