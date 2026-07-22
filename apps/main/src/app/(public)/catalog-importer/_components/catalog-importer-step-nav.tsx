"use client";

import { cn } from "@/lib/utils";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

export type CatalogImporterStep =
  | "start"
  | "prepare"
  | "preview"
  | "review"
  | "issues"
  | "download";

export function CatalogImporterStepNav({
  activeStep,
  controller,
  onStepChange,
}: {
  activeStep: CatalogImporterStep;
  controller: CatalogImporterWorkbenchController;
  onStepChange: (step: CatalogImporterStep) => void;
}) {
  const hasSource = controller.parsedSpreadsheet !== null;
  const hasResults = controller.matchedRows !== null;
  const allSteps: Array<{
    enabled: boolean;
    id: CatalogImporterStep;
    label: string;
  }> = [
    { enabled: true, id: "start", label: "Start" },
    { enabled: hasSource, id: "prepare", label: "Prepare" },
    { enabled: hasResults, id: "preview", label: "Preview" },
    {
      enabled: hasResults && controller.reviewProgressTotal > 0,
      id: "review",
      label:
        controller.reviewProgressTotal > 0
          ? `Review ${controller.completedReviewCount}/${controller.reviewProgressTotal}`
          : "Review",
    },
    {
      enabled: hasResults && controller.issueProgressTotal > 0,
      id: "issues",
      label:
        controller.issueProgressTotal > 0
          ? `Issues ${controller.completedIssueCount}/${controller.issueProgressTotal}`
          : "Issues",
    },
    { enabled: hasResults, id: "download", label: "Download" },
  ];
  const steps = allSteps.filter(
    (step) =>
      (step.id !== "review" || controller.reviewProgressTotal > 0) &&
      (step.id !== "issues" || controller.issueProgressTotal > 0),
  );

  return (
    <nav
      aria-label="Catalog importer steps"
      className="bg-background/95 sticky top-0 z-30 -mx-3 overflow-x-auto border-y px-3 backdrop-blur lg:-mx-8 lg:px-8"
    >
      <div className="flex min-w-max gap-5">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            disabled={!step.enabled}
            aria-current={activeStep === step.id ? "step" : undefined}
            className={cn(
              "relative py-3 text-sm font-medium whitespace-nowrap transition-colors",
              activeStep === step.id
                ? "text-foreground after:bg-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5"
                : "text-muted-foreground hover:text-foreground",
              !step.enabled &&
                "hover:text-muted-foreground cursor-not-allowed opacity-35",
            )}
            onClick={() => step.enabled && onStepChange(step.id)}
          >
            {step.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
