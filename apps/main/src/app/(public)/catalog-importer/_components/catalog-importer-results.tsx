"use client";

import { useCallback, useState } from "react";
import { CircleAlert, Download } from "lucide-react";
import { SellerIntentLink } from "@/components/seller-intent-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CatalogImporterAnalysis } from "@/app/(public)/catalog-importer/_components/catalog-importer-analysis";
import { CatalogImporterIssues } from "@/app/(public)/catalog-importer/_components/catalog-importer-issues";
import { CatalogImporterCatalogPreview } from "@/app/(public)/catalog-importer/_components/catalog-importer-catalog-preview";
import { CatalogImporterMatchSheet } from "@/app/(public)/catalog-importer/_components/catalog-importer-match-sheet";
import { CatalogImporterOverview } from "@/app/(public)/catalog-importer/_components/catalog-importer-overview";
import { CatalogImporterReviewQuiz } from "@/app/(public)/catalog-importer/_components/catalog-importer-review-quiz";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImportRow } from "@/lib/catalog-importer";

interface CatalogImporterResultsProps {
  controller: CatalogImporterWorkbenchController;
}

export function CatalogImporterResults({
  controller,
}: CatalogImporterResultsProps) {
  const [matchEditorRowId, setMatchEditorRowId] = useState<string | null>(null);
  const matchEditorRow =
    controller.includedRows.find((row) => row.id === matchEditorRowId) ?? null;
  const readyToDownload =
    controller.reviewRows.length === 0 && controller.issueCount === 0;
  const handleOpenReview = useCallback((row: CatalogImportRow) => {
    setMatchEditorRowId(row.id);
  }, []);
  const hasPreparationWork =
    controller.reviewRows.length > 0 || controller.issueCount > 0;
  const nextPreparationAction =
    controller.reviewRows.length > 0
      ? {
          href: "#catalog-importer-review-quiz",
          label: "Review next name",
        }
      : {
          href: "#catalog-importer-issues",
          label: "Fix data",
        };

  return (
    <div className="min-w-0 space-y-10">
      <CatalogImporterOverview controller={controller} />

      <CatalogImporterCatalogPreview
        controller={controller}
        onOpenReview={handleOpenReview}
      />

      <CatalogImporterAnalysis rows={controller.includedRows} />

      {hasPreparationWork ? (
        <section
          id="catalog-importer-preparation"
          aria-labelledby="catalog-importer-preparation-heading"
          className="border-t pt-10"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2
                id="catalog-importer-preparation-heading"
                className="text-xl font-semibold tracking-tight"
              >
                Finish preparing your workbook
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                Most of your collection is ready.{" "}
                {controller.reviewRows.length > 0
                  ? `${controller.reviewRows.length.toLocaleString()} ${controller.reviewRows.length === 1 ? "name needs" : "names need"} your cultivar decision. `
                  : ""}
                {controller.issueCount > 0
                  ? `${controller.issueCount.toLocaleString()} ${controller.issueCount === 1 ? "data item needs" : "data items need"} review.`
                  : ""}
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <a href={nextPreparationAction.href}>
                {nextPreparationAction.label}
              </a>
            </Button>
          </div>
        </section>
      ) : null}

      {controller.reviewRows.length > 0 ? (
        <CatalogImporterReviewQuiz controller={controller} />
      ) : null}

      {controller.issueCount > 0 ? (
        <CatalogImporterIssues controller={controller} />
      ) : null}

      {controller.downloadError ? (
        <Alert variant="destructive">
          <CircleAlert className="size-4" />
          <AlertTitle>Spreadsheet download did not finish</AlertTitle>
          <AlertDescription>{controller.downloadError}</AlertDescription>
        </Alert>
      ) : null}

      <section
        id="catalog-importer-download"
        aria-labelledby="catalog-importer-download-heading"
        className="flex scroll-mt-4 flex-col gap-5 border-t pt-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 id="catalog-importer-download-heading" className="font-semibold">
            {readyToDownload
              ? "Your prepared spreadsheet is ready"
              : "Download your progress"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Downloads a cleaned copy with your sheets and seller-owned columns.
            Linked names, approved fixes, and Daylily Catalog identity columns
            are included. XLSX formatting and formulas are not copied.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0"
          disabled={controller.downloadingResults}
          onClick={() => void controller.downloadResults()}
        >
          {controller.downloadingResults ? (
            <Spinner />
          ) : (
            <Download className="size-4" />
          )}
          Download prepared spreadsheet
        </Button>
      </section>

      <section
        aria-labelledby="catalog-importer-membership-heading"
        className="flex flex-col gap-5 border-t pt-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="max-w-2xl">
          <h2
            id="catalog-importer-membership-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Imagine this as your public catalog
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Daylily Catalog Pro includes a hosted seller catalog, seller
            dashboard, and discovery features. Your prepared workbook remains
            available to download here.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <SellerIntentLink
            ctaId="catalog-importer-membership"
            ctaLabel="Explore Pro membership"
            entrySurface="catalog_importer_preview"
            sourcePageType="catalog_importer"
            sourcePath="/catalog-importer"
          >
            Explore Pro membership
          </SellerIntentLink>
        </Button>
      </section>

      <CatalogImporterMatchSheet
        key={matchEditorRow?.id ?? "closed"}
        controller={controller}
        open={matchEditorRow !== null}
        row={matchEditorRow}
        onOpenChange={(open) => {
          if (!open) {
            setMatchEditorRowId(null);
          }
        }}
      />
    </div>
  );
}
