"use client";

import { useState } from "react";
import { CircleAlert, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CatalogImporterMapping } from "@/app/(public)/catalog-importer/_components/catalog-importer-mapping";
import { CatalogImporterManualTable } from "@/app/(public)/catalog-importer/_components/catalog-importer-manual-table";
import { CatalogImporterResults } from "@/app/(public)/catalog-importer/_components/catalog-importer-results";
import {
  CatalogImporterStepNav,
  type CatalogImporterStep,
} from "@/app/(public)/catalog-importer/_components/catalog-importer-step-nav";
import { CatalogImporterUpload } from "@/app/(public)/catalog-importer/_components/catalog-importer-upload";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImporterDraft } from "@/lib/catalog-importer-draft";
import type { CatalogImporterViewerState } from "@/lib/catalog-importer-membership";
import type { MembershipPriceDisplay } from "@/server/stripe/membership-price-display";

export function CatalogImporterWorkbench({
  initialDraft = null,
  membershipPriceDisplay = null,
  membershipStarted = false,
  viewerState = "anonymous",
}: {
  initialDraft?: CatalogImporterDraft | null;
  membershipPriceDisplay?: MembershipPriceDisplay | null;
  membershipStarted?: boolean;
  viewerState?: CatalogImporterViewerState;
}) {
  const controller = useCatalogImporterWorkbench(initialDraft);
  const [activeStep, setActiveStep] = useState<CatalogImporterStep>(() =>
    initialDraft?.matchedRows
      ? "preview"
      : initialDraft?.parsedSpreadsheet
        ? "prepare"
        : "start",
  );
  const changeStep = (step: CatalogImporterStep) => {
    setActiveStep(step);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const stepTarget = document.getElementById(
          `catalog-importer-step-${step}`,
        );
        const workbench = document.getElementById("catalog-importer-workbench");
        (stepTarget ?? workbench)?.scrollIntoView?.({ block: "start" });
      }),
    );
  };
  const buildCatalog = async () => {
    const built = await controller.buildCatalogPreview();
    if (built) {
      changeStep("preview");
    }
  };
  const reset = () => {
    changeStep("start");
  };
  const manualRowCount = Math.max(
    0,
    (controller.selectedSheet?.rows.length ?? 1) - 1,
  );

  return (
    <div
      id="catalog-importer-workbench"
      data-workbook-active={controller.selectedSheet ? "true" : undefined}
    >
      <div className="space-y-4">
        <CatalogImporterStepNav
          activeStep={activeStep}
          controller={controller}
          onStepChange={changeStep}
        />

        {activeStep === "start" ? (
          <div
            id="catalog-importer-step-start"
            className="!scroll-mt-16 space-y-8 pt-2"
          >
            <CatalogImporterUpload
              controller={controller}
              onClear={reset}
              onSourceReady={() => changeStep("prepare")}
            />
            {controller.parsedSpreadsheet ? (
              <Button type="button" onClick={() => changeStep("prepare")}>
                Continue preparing
              </Button>
            ) : null}
          </div>
        ) : null}

        {controller.fileError ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertTitle>Could not read that spreadsheet</AlertTitle>
            <AlertDescription>{controller.fileError}</AlertDescription>
          </Alert>
        ) : null}

        {controller.storageWarning ? (
          <Alert>
            <Info className="size-4" />
            <AlertTitle>Progress will not be restored</AlertTitle>
            <AlertDescription>{controller.storageWarning}</AlertDescription>
          </Alert>
        ) : null}

        {activeStep === "prepare" && controller.selectedSheet ? (
          <div
            id="catalog-importer-step-prepare"
            className="!scroll-mt-16 space-y-6 pt-2"
          >
            <CatalogImporterUpload
              controller={controller}
              onClear={reset}
              onEditMapping={undefined}
            />
            {controller.parsedSpreadsheet?.source === "manual" ? (
              <>
                <CatalogImporterManualTable controller={controller} />
                <div className="max-w-xl">
                  <Button
                    type="button"
                    className="w-full"
                    disabled={
                      manualRowCount === 0 ||
                      controller.processingStage !== null
                    }
                    onClick={() => void buildCatalog()}
                  >
                    {controller.processingStage
                      ? "Building catalog preview…"
                      : "Build catalog preview"}
                  </Button>
                </div>
              </>
            ) : (
              <CatalogImporterMapping
                controller={controller}
                onSubmit={() => void buildCatalog()}
              />
            )}
          </div>
        ) : null}

        {controller.selectedSheet && controller.mapping.title === null ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertTitle>Cultivar name is required</AlertTitle>
            <AlertDescription>
              Choose the column that contains cultivar names to build your
              catalog preview.
            </AlertDescription>
          </Alert>
        ) : null}

        {controller.matchError ? (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertTitle>Cultivar matching did not finish</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{controller.matchError}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void buildCatalog()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {controller.mapping.title !== null && controller.matchedRows ? (
          <CatalogImporterResults
            activeStep={activeStep}
            controller={controller}
            membershipPriceDisplay={membershipPriceDisplay}
            membershipStarted={membershipStarted}
            onStepChange={changeStep}
            viewerState={viewerState}
          />
        ) : null}
      </div>

      <div
        className="sr-only"
        aria-label="Catalog importer updates"
        aria-live="polite"
        aria-atomic="true"
      >
        {controller.liveAnnouncement}
      </div>
    </div>
  );
}
