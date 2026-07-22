"use client";

import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";
import type { CatalogImporterStep } from "@/app/(public)/catalog-importer/_components/catalog-importer-step-nav";

function RevealMetric({
  count,
  label,
  onClick,
  testId,
}: {
  count: number;
  label: string;
  onClick?: () => void;
  testId: string;
}) {
  const content = (
    <>
      <span
        className="block text-2xl font-semibold tracking-tight tabular-nums"
        data-testid={testId}
      >
        {count.toLocaleString()}
      </span>
      <span className="text-muted-foreground text-sm">{label}</span>
    </>
  );

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm hover:underline focus-visible:outline-2"
    >
      {content}
    </button>
  ) : (
    <div>{content}</div>
  );
}

export function CatalogImporterOverview({
  controller,
  onStepChange,
}: {
  controller: CatalogImporterWorkbenchController;
  onStepChange: (step: CatalogImporterStep) => void;
}) {
  const { counts } = controller;
  const linkedListingLabel =
    counts.linkedListingCount === 1 ? "listing" : "listings";
  const cultivarLabel =
    counts.uniqueCultivarCount === 1 ? "cultivar" : "cultivars";
  const outstandingMetrics = [
    controller.reviewRows.length > 0 ? (
      <RevealMetric
        key="review"
        count={controller.reviewRows.length}
        onClick={() => onStepChange("review")}
        label={
          controller.reviewRows.length === 1
            ? "potential match"
            : "potential matches"
        }
        testId="pending-decision-count"
      />
    ) : null,
    controller.remainingIssueCount > 0 ? (
      <RevealMetric
        key="issues"
        count={controller.remainingIssueCount}
        onClick={() => onStepChange("issues")}
        label={
          controller.remainingIssueCount === 1
            ? "spreadsheet issue"
            : "spreadsheet issues"
        }
        testId="issue-count"
      />
    ) : null,
  ].filter(Boolean);

  return (
    <section
      id="catalog-importer-summary"
      role="region"
      aria-label="Catalog preview ready"
      className="border-primary/40 space-y-3 border-l-2 py-1 pl-5 sm:pl-7"
    >
      <p className="text-primary text-sm font-medium">Catalog preview ready</p>
      <h2
        id="catalog-importer-summary-heading"
        className="max-w-4xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
      >
        We matched {counts.linkedListingCount.toLocaleString()}{" "}
        {linkedListingLabel} to {counts.uniqueCultivarCount.toLocaleString()}{" "}
        registered {cultivarLabel}
      </h2>
      {outstandingMetrics.length > 0 ? (
        <div className="flex max-w-2xl gap-8 pt-1">{outstandingMetrics}</div>
      ) : null}
    </section>
  );
}
