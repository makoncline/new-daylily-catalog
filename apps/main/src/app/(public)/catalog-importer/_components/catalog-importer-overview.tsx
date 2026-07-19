"use client";

import { ArrowDown, Check, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const nextAction =
    counts.reviewQueueCount > 0
      ? {
          href: "#catalog-importer-review-quiz",
          label: `Review ${countLabel(counts.reviewQueueCount, "name")}`,
        }
      : counts.issueCount > 0
        ? {
            href: "#catalog-importer-issues",
            label: `Fix ${countLabel(counts.issueCount, "data item")}`,
          }
        : {
            href: "#catalog-importer-download",
            label: "Download prepared workbook",
          };

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

      <p className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
        <LockKeyhole aria-hidden="true" className="size-3.5" />
        Private browser preview · Nothing has been published
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

      <div className="mt-7 grid gap-5 border-b pb-7 sm:grid-cols-2 sm:gap-8">
        <div>
          <h3 className="text-sm font-medium">From your spreadsheet</h3>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Names, prices, descriptions, private notes, and seller images.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium">Added by Daylily Catalog</h3>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Registered identity, reference photos, hybridizer, year, awards,
            bloom details, and searchable cultivar attributes.
          </p>
        </div>
      </div>

      {counts.pendingCultivarDecisionCount > 0 ? (
        <p className="text-muted-foreground mt-5 max-w-3xl text-sm">
          {countLabel(counts.pendingCultivarDecisionCount, "listing")}{" "}
          {counts.pendingCultivarDecisionCount === 1 ? "is" : "are"} waiting for
          a cultivar decision, so{" "}
          {counts.pendingCultivarDecisionCount === 1 ? "it is" : "they are"} not
          yet enriched or included in the preview and insights.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <a href="#catalog-importer-preview">
            Explore your catalog
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={nextAction.href}>
            {nextAction.label}
            <Check aria-hidden="true" className="size-4" />
          </a>
        </Button>
      </div>
    </section>
  );
}
