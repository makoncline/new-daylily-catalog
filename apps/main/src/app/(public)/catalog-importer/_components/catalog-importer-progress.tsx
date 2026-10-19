"use client";

import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

const PROCESSING_LABELS = {
  building: "Building catalog preview",
  detecting: "Detecting listings",
  matching: "Matching cultivar names",
} as const;

export function CatalogImporterProgress({
  controller,
}: {
  controller: Pick<
    CatalogImporterWorkbenchController,
    "processingStage" | "matchingProgress"
  >;
}) {
  const progressValue = controller.matchingProgress
    ? (controller.matchingProgress.processed /
        Math.max(controller.matchingProgress.total, 1)) *
      100
    : 0;
  return controller.processingStage ? (
    <div
      className="space-y-3 py-2"
      role="status"
      aria-label="Building catalog preview"
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="flex items-center gap-2">
          <Spinner />
          {PROCESSING_LABELS[controller.processingStage]}
        </span>
        {controller.matchingProgress ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {controller.matchingProgress.processed.toLocaleString()} /{" "}
            {controller.matchingProgress.total.toLocaleString()}
          </span>
        ) : null}
      </div>
      {controller.matchingProgress ? (
        <Progress
          value={progressValue}
          aria-valuenow={progressValue}
          aria-label="Cultivar matching progress"
        />
      ) : null}
    </div>
  ) : null;
}
