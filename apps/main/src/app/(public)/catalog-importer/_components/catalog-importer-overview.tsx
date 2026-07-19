"use client";

import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

function RevealMetric({
  count,
  label,
  testId,
}: {
  count: number;
  label: string;
  testId: string;
}) {
  return (
    <div className="px-0 py-4 sm:px-4">
      <dd className="text-2xl font-semibold tabular-nums" data-testid={testId}>
        {count.toLocaleString()}
      </dd>
      <dt className="text-muted-foreground mt-0.5 text-xs">{label}</dt>
    </div>
  );
}

export function CatalogImporterOverview({
  controller,
}: {
  controller: CatalogImporterWorkbenchController;
}) {
  const { counts } = controller;
  return (
    <section
      id="catalog-importer-summary"
      role="region"
      aria-labelledby="catalog-importer-summary-heading"
      className="border-b pb-10"
    >
      <h2
        id="catalog-importer-summary-heading"
        className="text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        Your private catalog preview is ready
      </h2>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
        {counts.linkedListingCount > 0
          ? "Linked listings now include Daylily Catalog photos and registry details."
          : "Review cultivar names to add Daylily Catalog photos and registry details."}
      </p>

      <dl className="mt-6 grid grid-cols-3 divide-x border-y">
        <RevealMetric
          count={counts.linkedListingCount}
          label="listings linked"
          testId="linked-listing-count"
        />
        <RevealMetric
          count={controller.reviewRows.length}
          label="names to review"
          testId="pending-decision-count"
        />
        <RevealMetric
          count={counts.issueCount}
          label="data issues"
          testId="issue-count"
        />
      </dl>
    </section>
  );
}
