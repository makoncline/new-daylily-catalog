"use client";

import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

function RevealMetric({
  count,
  href,
  label,
  testId,
}: {
  count: number;
  href?: string;
  label: string;
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

  return href ? (
    <a
      href={href}
      className="rounded-sm hover:underline focus-visible:outline-2"
    >
      {content}
    </a>
  ) : (
    <div>{content}</div>
  );
}

export function CatalogImporterOverview({
  controller,
}: {
  controller: CatalogImporterWorkbenchController;
}) {
  const { counts } = controller;
  const linkedListingLabel =
    counts.linkedListingCount === 1 ? "listing" : "listings";
  const cultivarLabel =
    counts.uniqueCultivarCount === 1 ? "cultivar" : "cultivars";

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
      <div className="grid max-w-2xl grid-cols-3 gap-4 pt-1">
        <RevealMetric
          count={counts.linkedListingCount}
          href={
            counts.linkedListingCount > 0
              ? "#catalog-importer-preview"
              : undefined
          }
          label="listings matched"
          testId="linked-listing-count"
        />
        <RevealMetric
          count={controller.reviewRows.length}
          href={
            controller.reviewRows.length > 0
              ? "#catalog-importer-review-quiz"
              : undefined
          }
          label="potential matches"
          testId="pending-decision-count"
        />
        <RevealMetric
          count={controller.remainingIssueCount}
          href={
            controller.remainingIssueCount > 0
              ? "#catalog-importer-issues"
              : undefined
          }
          label="spreadsheet issues"
          testId="issue-count"
        />
      </div>
    </section>
  );
}
