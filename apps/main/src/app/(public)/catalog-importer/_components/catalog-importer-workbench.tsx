"use client";

import { Check, CircleAlert, Download, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CatalogImporterMapping } from "@/app/(public)/catalog-importer/_components/catalog-importer-mapping";
import { CatalogImporterResults } from "@/app/(public)/catalog-importer/_components/catalog-importer-results";
import { CatalogImporterUpload } from "@/app/(public)/catalog-importer/_components/catalog-importer-upload";
import { useCatalogImporterWorkbench } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

const STEPS = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Map" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function getStepState(step: StepId, currentStep: StepId) {
  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const currentIndex = STEPS.findIndex((item) => item.id === currentStep);

  if (stepIndex < currentIndex) return "complete";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
}

export function CatalogImporterWorkbench() {
  const controller = useCatalogImporterWorkbench();

  return (
    <div className="bg-background min-w-0 overflow-x-clip">
      <div className="mx-auto w-full max-w-[1440px] px-3 py-8 lg:px-8 lg:py-12">
        <PageHeader
          heading="Clean a daylily spreadsheet"
          text="Map listing columns, match registered cultivars, review uncertain names, and export a normalized CSV."
        >
          <Button
            type="button"
            variant="outline"
            onClick={controller.downloadTemplate}
          >
            <Download className="size-4" />
            Download template
          </Button>
        </PageHeader>

        <nav aria-label="Catalog import progress" className="mb-6">
          <ol className="bg-card grid grid-cols-3 overflow-hidden rounded-lg border shadow-sm">
            {STEPS.map((step, index) => {
              const state = getStepState(step.id, controller.currentStep);

              return (
                <li
                  key={step.id}
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn(
                    "relative flex min-w-0 items-center gap-2 border-r px-3 py-3 text-sm last:border-r-0 lg:px-5",
                    state === "current" && "bg-primary/5 text-foreground",
                    state === "upcoming" && "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      state === "complete" &&
                        "border-primary bg-primary text-primary-foreground",
                      state === "current" && "border-primary text-primary",
                    )}
                    aria-hidden="true"
                  >
                    {state === "complete" ? (
                      <Check className="size-3.5" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="truncate font-medium">{step.label}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="space-y-4">
          <CatalogImporterUpload controller={controller} />

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

          {controller.selectedSheet ? (
            <CatalogImporterMapping controller={controller} />
          ) : null}

          {controller.selectedSheet && controller.mapping.title === null ? (
            <Alert variant="destructive">
              <CircleAlert className="size-4" />
              <AlertTitle>Cultivar name is required</AlertTitle>
              <AlertDescription>
                Choose the column that contains cultivar names to build the
                cleaned table.
              </AlertDescription>
            </Alert>
          ) : null}

          {controller.matchError ? (
            <Alert variant="destructive">
              <CircleAlert className="size-4" />
              <AlertTitle>Cultivar matching did not finish</AlertTitle>
              <AlertDescription>{controller.matchError}</AlertDescription>
            </Alert>
          ) : null}

          {controller.mapping.title !== null && controller.matchedRows ? (
            <CatalogImporterResults controller={controller} />
          ) : null}
        </div>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {controller.liveAnnouncement}
        </div>
      </div>
    </div>
  );
}
