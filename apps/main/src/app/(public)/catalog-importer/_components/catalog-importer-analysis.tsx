"use client";

import { useMemo, useState } from "react";
import {
  splitFacetValue,
  splitFormFacetValue,
} from "@/components/public-catalog-search/public-catalog-search-filter-utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getCultivarImage } from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";

export interface CatalogImporterInsightFilter {
  id: "award" | "bloomSeason" | "form" | "hybridizer" | "ploidy" | "year";
  value: string | string[];
}

type AnalysisView =
  | "awards"
  | "bloomSeason"
  | "form"
  | "hybridizer"
  | "ploidy"
  | "year";

interface AnalysisFacet {
  filterId: CatalogImporterInsightFilter["id"];
  label: string;
  title: string;
  value: AnalysisView;
  filterValue: (label: string) => CatalogImporterInsightFilter["value"];
  values: (match: CultivarMatchCandidate) => string[];
}

const ANALYSIS_FACETS: AnalysisFacet[] = [
  {
    filterId: "hybridizer",
    label: "By hybridizer",
    title: "Top hybridizers",
    value: "hybridizer",
    filterValue: (label) => [label],
    values: (match) => (match.hybridizer ? [match.hybridizer] : []),
  },
  {
    filterId: "year",
    label: "By year",
    title: "Top registration years",
    value: "year",
    filterValue: (label) => `${label}:${label}`,
    values: (match) => (match.year === null ? [] : [String(match.year)]),
  },
  {
    filterId: "award",
    label: "Award winning",
    title: "Top awards",
    value: "awards",
    filterValue: (label) => [label],
    values: (match) => splitFacetValue(match.awardNames),
  },
  {
    filterId: "ploidy",
    label: "By ploidy",
    title: "Ploidy",
    value: "ploidy",
    filterValue: (label) => [label],
    values: (match) => (match.ploidy ? [match.ploidy] : []),
  },
  {
    filterId: "bloomSeason",
    label: "Bloom season",
    title: "Bloom seasons",
    value: "bloomSeason",
    filterValue: (label) => [label],
    values: (match) => (match.bloomSeason ? [match.bloomSeason] : []),
  },
  {
    filterId: "form",
    label: "Flower form",
    title: "Flower forms",
    value: "form",
    filterValue: (label) => [label],
    values: (match) => splitFormFacetValue(match.form),
  },
];

const MAX_VALUES = 7;

function getLinkedUniqueRows(rows: CatalogImportRow[]) {
  const rowsByCultivarId = new Map<string, CatalogImportRow>();

  for (const row of rows) {
    if (row.linkState !== "linked" || !row.match) continue;
    rowsByCultivarId.set(row.match.cultivarReferenceId, row);
  }

  return [...rowsByCultivarId.values()];
}

function getRankedValues(rows: CatalogImportRow[], facet: AnalysisFacet) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row.match) continue;

    const values = [...new Set(facet.values(row.match))];

    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return {
    values: [...counts.entries()]
      .sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )
      .slice(0, MAX_VALUES),
  };
}

export function CatalogImporterAnalysis({
  onApplyFilter,
  rows,
}: {
  onApplyFilter: (filter: CatalogImporterInsightFilter) => void;
  rows: CatalogImportRow[];
}) {
  const [view, setView] = useState<AnalysisView>("hybridizer");
  const uniqueRows = useMemo(() => getLinkedUniqueRows(rows), [rows]);
  const availableRankings = useMemo(
    () =>
      ANALYSIS_FACETS.map((facet) => ({
        facet,
        ranking: getRankedValues(uniqueRows, facet),
      })).filter(({ ranking }) => ranking.values.length > 0),
    [uniqueRows],
  );
  const unresolvedListingCount = rows.filter(
    (row) => row.linkState !== "linked",
  ).length;
  const referencePhotoCount = uniqueRows.filter(
    (row) => getCultivarImage(row.match) !== null,
  ).length;
  const awardWinningCount = uniqueRows.filter(
    (row) => splitFacetValue(row.match?.awardNames).length > 0,
  ).length;
  const awardFilters = [
    ...new Set(
      uniqueRows.flatMap((row) => splitFacetValue(row.match?.awardNames)),
    ),
  ];
  const registrationYears = uniqueRows
    .map((row) => row.match?.year)
    .filter((year): year is number => year !== null && year !== undefined);
  const earliestYear =
    registrationYears.length > 0 ? Math.min(...registrationYears) : null;
  const latestYear =
    registrationYears.length > 0 ? Math.max(...registrationYears) : null;
  const selected =
    availableRankings.find(({ facet }) => facet.value === view) ??
    availableRankings[0];

  if (uniqueRows.length === 0) {
    return null;
  }

  const largestCount = selected
    ? Math.max(1, ...selected.ranking.values.map(([, count]) => count))
    : 1;

  return (
    <section
      id="catalog-importer-insights"
      aria-labelledby="catalog-importer-analysis-heading"
      className="!scroll-mt-16 border-t pt-10"
    >
      <h2
        id="catalog-importer-analysis-heading"
        className="text-xl font-semibold tracking-tight"
      >
        Explore your catalog
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Based on {uniqueRows.length.toLocaleString()} linked unique{" "}
        {uniqueRows.length === 1 ? "cultivar" : "cultivars"}.
        {unresolvedListingCount > 0
          ? ` ${unresolvedListingCount.toLocaleString()} unresolved ${
              unresolvedListingCount === 1 ? "listing is" : "listings are"
            } not included.`
          : ""}
      </p>
      <div className="mt-5 grid gap-x-8 gap-y-3 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <span className="font-medium">
          {referencePhotoCount.toLocaleString()}{" "}
          {referencePhotoCount === 1 ? "cultivar has" : "cultivars have"} a
          reference photo
        </span>
        {awardWinningCount > 0 ? (
          <a
            href="#catalog-importer-preview"
            onClick={() => {
              onApplyFilter({ id: "award", value: awardFilters });
            }}
            className="hover:text-primary focus-visible:ring-ring rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2"
          >
            {awardWinningCount.toLocaleString()} award-winning{" "}
            {awardWinningCount === 1 ? "cultivar" : "cultivars"}
          </a>
        ) : (
          <span className="text-muted-foreground">No awards found yet</span>
        )}
        {earliestYear !== null && latestYear !== null ? (
          <span className="font-medium">
            Registrations span{" "}
            {earliestYear === latestYear
              ? earliestYear
              : `${earliestYear}–${latestYear}`}
          </span>
        ) : null}
      </div>
      {selected ? (
        <div className="mt-5 space-y-4">
          <ToggleGroup
            type="single"
            value={selected.facet.value}
            onValueChange={(nextView) => {
              if (nextView) setView(nextView as AnalysisView);
            }}
            variant="outline"
            className="flex flex-wrap justify-start gap-2"
            aria-label="Catalog breakdown"
          >
            {availableRankings.map(({ facet: option }) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground h-8 flex-none rounded-full px-3 text-xs"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div aria-live="polite">
            <h3 className="font-medium">{selected.facet.title}</h3>
            <ol className="mt-4 space-y-3">
              {selected.ranking.values.map(([label, count]) => (
                <li key={label} className="text-sm">
                  <a
                    href="#catalog-importer-preview"
                    aria-label={`Show ${count.toLocaleString()} ${
                      count === 1 ? "cultivar" : "cultivars"
                    } for ${label}`}
                    onClick={() =>
                      onApplyFilter({
                        id: selected.facet.filterId,
                        value: selected.facet.filterValue(label),
                      })
                    }
                    className={
                      largestCount === 1
                        ? "focus-visible:ring-ring flex items-center justify-between gap-3 rounded-sm outline-none hover:opacity-80 focus-visible:ring-2"
                        : "focus-visible:ring-ring grid grid-cols-[minmax(6rem,11rem)_minmax(4rem,1fr)_auto] items-center gap-3 rounded-sm outline-none hover:opacity-80 focus-visible:ring-2"
                    }
                  >
                    <span className="truncate font-medium" title={label}>
                      {label}
                    </span>
                    {largestCount > 1 ? (
                      <span className="bg-muted h-2.5 overflow-hidden rounded-full">
                        <span
                          className="bg-primary block h-full min-w-1 rounded-full"
                          style={{ width: `${(count / largestCount) * 100}%` }}
                        />
                      </span>
                    ) : null}
                    <span className="text-muted-foreground text-right tabular-nums">
                      {count.toLocaleString()}{" "}
                      {count === 1 ? "cultivar" : "cultivars"}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}
