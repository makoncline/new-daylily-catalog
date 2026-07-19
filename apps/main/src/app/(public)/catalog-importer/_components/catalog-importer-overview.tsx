"use client";

import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

function joinList(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return parts.join(" and ");
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

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
  const { counts, enrichment } = controller;
  const enrichmentDetails = [
    enrichment.referencePhotoListingCount > 0
      ? countLabel(
          enrichment.referencePhotoListingCount,
          "listing with a reference photo",
          "listings with reference photos",
        )
      : null,
    enrichment.awardWinningCultivarCount > 0
      ? countLabel(
          enrichment.awardWinningCultivarCount,
          "award-winning cultivar",
        )
      : null,
    enrichment.searchableAttributeCount > 0
      ? countLabel(
          enrichment.searchableAttributeCount,
          "searchable attribute type",
        )
      : null,
  ].filter((detail): detail is string => detail !== null);
  const collectionDetails = [
    enrichment.hybridizerCount > 0
      ? countLabel(enrichment.hybridizerCount, "hybridizer")
      : null,
    enrichment.registrationYearMin !== null &&
    enrichment.registrationYearMax !== null
      ? enrichment.registrationYearMin === enrichment.registrationYearMax
        ? `registration year ${enrichment.registrationYearMin}`
        : `registration years ${enrichment.registrationYearMin}–${enrichment.registrationYearMax}`
      : null,
  ].filter((detail): detail is string => detail !== null);
  return (
    <section
      id="catalog-importer-summary"
      role="region"
      aria-labelledby="catalog-importer-summary-heading"
      className="border-b pb-10"
    >
      <p className="text-primary text-sm font-medium">Catalog revealed</p>
      <h2
        id="catalog-importer-summary-heading"
        className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        Your private catalog preview is ready
      </h2>
      <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed sm:text-base">
        {counts.linkedListingCount > 0
          ? `We linked ${countLabel(counts.linkedListingCount, "listing")}, representing ${countLabel(counts.uniqueCultivarCount, "unique registered cultivar")}.`
          : "Your workspace is ready for cultivar review."}{" "}
        {enrichmentDetails.length > 0
          ? `Matching unlocked ${joinList(enrichmentDetails)}${collectionDetails.length > 0 ? ` across ${joinList(collectionDetails)}` : ""}.`
          : "Linking cultivar identities will add reference photos, registry details, and searchable attributes."}
      </p>

      <dl className="mt-7 grid border-y sm:grid-cols-5 sm:divide-x">
        <RevealMetric
          count={counts.sourceRowCount}
          label="spreadsheet rows"
          testId="source-row-count"
        />
        <RevealMetric
          count={counts.detectedListingCount}
          label="listings detected"
          testId="detected-listing-count"
        />
        <RevealMetric
          count={counts.linkedListingCount}
          label="listings linked"
          testId="linked-listing-count"
        />
        <RevealMetric
          count={counts.uniqueCultivarCount}
          label="linked unique cultivars"
          testId="unique-cultivar-count"
        />
        <RevealMetric
          count={counts.pendingCultivarDecisionCount}
          label="decisions pending"
          testId="pending-decision-count"
        />
      </dl>
    </section>
  );
}
