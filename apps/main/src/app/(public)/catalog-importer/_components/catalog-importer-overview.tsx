"use client";

import { ArrowDown, Check, CircleAlert, Sprout } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogImporterWorkbenchController } from "@/app/(public)/catalog-importer/_hooks/use-catalog-importer-workbench";

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

function SummaryMetric({
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
      <span>
        <span
          className="block text-2xl font-semibold tabular-nums"
          data-testid={testId}
        >
          {count.toLocaleString()}
        </span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </span>
      {href ? (
        <ArrowDown
          aria-hidden="true"
          className="text-muted-foreground size-4 transition-transform group-hover:translate-y-0.5"
        />
      ) : (
        <Check aria-hidden="true" className="text-primary size-4" />
      )}
    </>
  );
  const className =
    "group flex items-center justify-between gap-3 border-b px-5 py-4 outline-none sm:border-r sm:border-b-0 sm:last:border-r-0";

  return href ? (
    <a
      href={href}
      className={`${className} hover:bg-background/70 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset`}
    >
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function CatalogImporterOverview({
  controller,
}: {
  controller: CatalogImporterWorkbenchController;
}) {
  const priceIssues = controller.resultRows.filter(
    (row) => row.priceWarning !== null,
  ).length;
  const imageIssues = controller.resultRows.filter(
    (row) => row.imageUrlWarning !== null,
  ).length;
  const cultivarIdIssues = controller.resultRows.filter(
    (row) => row.cultivarReferenceIdWarning !== null,
  ).length;
  const duplicateIssues = new Set(
    controller.resultRows
      .filter((row) => row.duplicateOfSourceRow !== null)
      .map((row) => row.duplicateOfSourceRow),
  ).size;
  const issueDetails = [
    duplicateIssues > 0 ? countLabel(duplicateIssues, "duplicate group") : null,
    priceIssues > 0 ? countLabel(priceIssues, "price issue") : null,
    imageIssues > 0 ? countLabel(imageIssues, "image issue") : null,
    cultivarIdIssues > 0
      ? countLabel(cultivarIdIssues, "saved ID issue")
      : null,
  ].filter((detail): detail is string => Boolean(detail));

  return (
    <Card
      id="catalog-importer-summary"
      role="region"
      aria-labelledby="catalog-importer-summary-heading"
      className="border-primary/20 from-primary/[0.08] overflow-hidden bg-gradient-to-br via-transparent to-transparent shadow-sm"
    >
      <CardContent className="p-0">
        <div className="flex gap-4 p-5 sm:p-6">
          <div className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm">
            <Sprout aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <h2
              id="catalog-importer-summary-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Your catalog is taking shape
            </h2>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
              We linked registered cultivars for{" "}
              {controller.matchedCount.toLocaleString()} of{" "}
              {controller.resultRows.length.toLocaleString()} listings. Take a
              look around, then help with anything that still needs a human eye.
            </p>
          </div>
        </div>

        <div className="grid border-t sm:grid-cols-3">
          <SummaryMetric
            count={controller.matchedCount}
            href="#catalog-importer-preview"
            label="cultivars linked"
            testId="summary-matched-count"
          />
          <SummaryMetric
            count={controller.reviewRows.length}
            href={
              controller.reviewRows.length > 0
                ? "#catalog-importer-review-quiz"
                : undefined
            }
            label="matches need review"
            testId="summary-review-count"
          />
          <SummaryMetric
            count={controller.issueCount}
            href={
              controller.issueCount > 0 ? "#catalog-importer-issues" : undefined
            }
            label="spreadsheet issues"
            testId="summary-issue-count"
          />
        </div>

        {issueDetails.length > 0 ? (
          <div className="text-muted-foreground bg-background/45 flex items-center gap-2 border-t px-5 py-3 text-xs">
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            <span>{issueDetails.join(" · ")}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
