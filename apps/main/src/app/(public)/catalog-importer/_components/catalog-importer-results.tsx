"use client";

import { useCallback, useState } from "react";
import { Download } from "lucide-react";
import { SellerIntentLink } from "@/components/seller-intent-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="min-w-0 space-y-4">
      <CatalogImporterOverview controller={controller} />

      <CatalogImporterCatalogPreview
        controller={controller}
        onOpenReview={handleOpenReview}
      />

      {controller.reviewRows.length > 0 ? (
        <CatalogImporterReviewQuiz controller={controller} />
      ) : null}

      {controller.issueCount > 0 ? (
        <CatalogImporterIssues controller={controller} />
      ) : null}

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              {readyToDownload
                ? "Your prepared spreadsheet is ready"
                : "Download your progress"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Downloads a new workbook with your original cell values and
              sheets, plus Daylily Catalog IDs and cultivar links. XLSX
              formatting and formulas are not copied.
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
        </CardContent>
      </Card>

      <CatalogImporterAnalysis rows={controller.resultRows} />

      <Card className="border-primary/20 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Ready to publish?</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Membership unlocks the dashboard and hosted catalogs. Keep this
              prepared spreadsheet for the import flow when it becomes
              available.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <SellerIntentLink
              ctaId="catalog-importer-membership"
              ctaLabel="Explore membership"
              entrySurface="catalog_importer_ready_to_publish"
              sourcePageType="catalog_importer"
              sourcePath="/catalog-importer"
            >
              Explore membership
            </SellerIntentLink>
          </Button>
        </CardContent>
      </Card>

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
