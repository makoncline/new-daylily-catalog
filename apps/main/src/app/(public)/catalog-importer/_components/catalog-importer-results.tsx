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
    controller.resultRows.find((row) => row.id === matchEditorRowId) ?? null;
  const readyToDownload =
    controller.reviewRows.length === 0 && controller.issueCount === 0;
  const handleOpenReview = useCallback((row: CatalogImportRow) => {
    setMatchEditorRowId(row.id);
  }, []);

  return (
    <div className="min-w-0 space-y-10">
      <CatalogImporterOverview controller={controller} />

      <CatalogImporterCatalogPreview
        controller={controller}
        onOpenReview={handleOpenReview}
      />

      <section
        aria-labelledby="catalog-importer-membership-heading"
        className="border-primary/20 bg-primary/[0.035] flex flex-col gap-5 border-y px-1 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-5"
      >
        <div className="max-w-2xl">
          <h2
            id="catalog-importer-membership-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Turn this preview into your public catalog
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            We already linked {controller.matchedCount.toLocaleString()} of{" "}
            {controller.resultRows.length.toLocaleString()} listings. Membership
            unlocks the dashboard and hosted catalogs; keep the prepared
            spreadsheet for mass import when it becomes available.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <SellerIntentLink
            ctaId="catalog-importer-membership"
            ctaLabel="Become a member"
            entrySurface="catalog_importer_preview"
            sourcePageType="catalog_importer"
            sourcePath="/catalog-importer"
          >
            Become a member
          </SellerIntentLink>
        </Button>
      </section>

      <CatalogImporterAnalysis rows={controller.resultRows} />

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
        aria-labelledby="catalog-importer-download-heading"
        className="flex flex-col gap-5 border-t pt-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 id="catalog-importer-download-heading" className="font-semibold">
            {readyToDownload
              ? "Your prepared spreadsheet is ready"
              : "Download your progress"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Downloads a new workbook with your original cell values and sheets,
            plus Daylily Catalog IDs and cultivar links. XLSX formatting and
            formulas are not copied.
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
