"use client";

import { useMemo, useState } from "react";
import {
  splitFacetValue,
  splitFormFacetValue,
} from "@/components/public-catalog-search/public-catalog-search-filter-utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getAwardCode,
  getAwardDisplayName,
  getCultivarImage,
} from "@/app/(public)/catalog-importer/_lib/catalog-importer-presentation";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";

export interface CatalogImporterInsightFilter {
  id:
    | "award"
    | "bloomHabit"
    | "bloomSeason"
    | "bloomSize"
    | "branches"
    | "budcount"
    | "flowerShow"
    | "foliageType"
    | "form"
    | "fragrance"
    | "hybridizer"
    | "ploidy"
    | "scapeHeight"
    | "sculptedType"
    | "year";
  value: string | string[];
}

type AnalysisView =
  | "awards"
  | "bloomHabit"
  | "bloomSeason"
  | "bloomSize"
  | "branches"
  | "budCount"
  | "flowerShow"
  | "foliageType"
  | "form"
  | "fragrance"
  | "hybridizer"
  | "ploidy"
  | "scapeHeight"
  | "sculptedType"
  | "year";

interface AnalysisFacet {
  filterId: CatalogImporterInsightFilter["id"];
  label: string;
  title: string;
  value: AnalysisView;
  filterValue: (label: string) => CatalogImporterInsightFilter["value"];
  values: (match: CultivarMatchCandidate) => string[];
}

interface NumericBucket {
  label: string;
  max?: number;
  min?: number;
}

const BLOOM_SIZE_BUCKETS: NumericBucket[] = [
  { label: "Under 4 in.", max: 3.99 },
  { label: "4–5.9 in.", min: 4, max: 5.99 },
  { label: "6 in. and larger", min: 6 },
];
const SCAPE_HEIGHT_BUCKETS: NumericBucket[] = [
  { label: "Under 24 in.", max: 23.99 },
  { label: "24–35 in.", min: 24, max: 35.99 },
  { label: "36 in. and taller", min: 36 },
];
const BUD_COUNT_BUCKETS: NumericBucket[] = [
  { label: "Under 15 buds", max: 14 },
  { label: "15–24 buds", min: 15, max: 24 },
  { label: "25 or more buds", min: 25 },
];
const BRANCH_COUNT_BUCKETS: NumericBucket[] = [
  { label: "0–2 branches", max: 2 },
  { label: "3–4 branches", min: 3, max: 4 },
  { label: "5 or more branches", min: 5 },
];

function getNumericBucket(
  value: number | null | undefined,
  buckets: NumericBucket[],
) {
  if (value === null || value === undefined) return [];

  const bucket = buckets.find(
    ({ max, min }) =>
      (min === undefined || value >= min) &&
      (max === undefined || value <= max),
  );
  return bucket ? [bucket.label] : [];
}

function getNumericBucketFilter(label: string, buckets: NumericBucket[]) {
  const bucket = buckets.find((option) => option.label === label);
  if (!bucket) return "";
  return `${bucket.min ?? ""}:${bucket.max ?? ""}`;
}

function getBloomHabitValues(match: CultivarMatchCandidate) {
  const values = splitFacetValue(match.bloomHabit);
  if (
    match.rebloom === true &&
    !values.some((value) => value.toLowerCase() === "reblooms")
  ) {
    values.push("Reblooms");
  }
  return values;
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
    filterValue: (label) => [getAwardCode(label)],
    values: (match) =>
      splitFacetValue(match.awardNames).map(getAwardDisplayName),
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
  {
    filterId: "bloomSize",
    label: "Bloom size",
    title: "Bloom sizes",
    value: "bloomSize",
    filterValue: (label) => getNumericBucketFilter(label, BLOOM_SIZE_BUCKETS),
    values: (match) => getNumericBucket(match.bloomSizeIn, BLOOM_SIZE_BUCKETS),
  },
  {
    filterId: "scapeHeight",
    label: "Scape height",
    title: "Scape heights",
    value: "scapeHeight",
    filterValue: (label) => getNumericBucketFilter(label, SCAPE_HEIGHT_BUCKETS),
    values: (match) =>
      getNumericBucket(match.scapeHeightIn, SCAPE_HEIGHT_BUCKETS),
  },
  {
    filterId: "bloomHabit",
    label: "Bloom behavior",
    title: "Bloom behavior",
    value: "bloomHabit",
    filterValue: (label) => [label],
    values: getBloomHabitValues,
  },
  {
    filterId: "fragrance",
    label: "Fragrance",
    title: "Fragrance",
    value: "fragrance",
    filterValue: (label) => [label],
    values: (match) => splitFacetValue(match.fragrance),
  },
  {
    filterId: "foliageType",
    label: "Foliage type",
    title: "Foliage types",
    value: "foliageType",
    filterValue: (label) => [label],
    values: (match) => splitFacetValue(match.foliageType),
  },
  {
    filterId: "flowerShow",
    label: "Flower show",
    title: "Flower show classifications",
    value: "flowerShow",
    filterValue: (label) => [label],
    values: (match) => splitFacetValue(match.flowerShow),
  },
  {
    filterId: "sculptedType",
    label: "Sculpting",
    title: "Sculpted forms",
    value: "sculptedType",
    filterValue: (label) => [label],
    values: (match) => splitFacetValue(match.sculptedTypes),
  },
  {
    filterId: "budcount",
    label: "Bud count",
    title: "Bud counts",
    value: "budCount",
    filterValue: (label) => getNumericBucketFilter(label, BUD_COUNT_BUCKETS),
    values: (match) => getNumericBucket(match.budCount, BUD_COUNT_BUCKETS),
  },
  {
    filterId: "branches",
    label: "Branch count",
    title: "Branch counts",
    value: "branches",
    filterValue: (label) => getNumericBucketFilter(label, BRANCH_COUNT_BUCKETS),
    values: (match) => getNumericBucket(match.branches, BRANCH_COUNT_BUCKETS),
  },
];

const MAX_VALUES = 5;

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

  const allValues = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );

  return {
    allValues,
    values: allValues.slice(0, MAX_VALUES),
  };
}

function formatCultivarCount(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "cultivar" : "cultivars"}`;
}

function getMaximum(
  rows: CatalogImportRow[],
  value: (match: CultivarMatchCandidate) => number | null | undefined,
) {
  const values = rows
    .map((row) => (row.match ? value(row.match) : null))
    .filter((item): item is number => item !== null && item !== undefined);
  return values.length > 0 ? Math.max(...values) : null;
}

function getInsightSummary({
  facet,
  ranking,
  rows,
}: {
  facet: AnalysisFacet;
  ranking: ReturnType<typeof getRankedValues>;
  rows: CatalogImportRow[];
}) {
  const top = ranking.values[0];
  if (!top) return null;
  const [topLabel, topCount] = top;

  switch (facet.value) {
    case "hybridizer": {
      if (topCount === 1) {
        return `Your collection represents ${ranking.allValues.length.toLocaleString()} hybridizers.`;
      }
      const tiedHybridizers = ranking.allValues.filter(
        ([, count]) => count === topCount,
      ).length;
      if (tiedHybridizers > 1) {
        return `${tiedHybridizers.toLocaleString()} hybridizers share the top spot, with ${formatCultivarCount(topCount)} each.`;
      }
      return `${topLabel} is your most represented hybridizer, with ${formatCultivarCount(topCount)}.`;
    }
    case "year": {
      const years = rows
        .map((row) => row.match?.year)
        .filter((year): year is number => year !== null && year !== undefined);
      const earliest = Math.min(...years);
      const latest = Math.max(...years);
      return earliest === latest
        ? `Your linked cultivars were registered in ${earliest}.`
        : `Your collection spans ${latest - earliest} years of registrations, from ${earliest} to ${latest}.`;
    }
    case "awards": {
      const awarded = rows.filter(
        (row) => splitFacetValue(row.match?.awardNames).length > 0,
      ).length;
      return `${formatCultivarCount(awarded)} in your collection ${awarded === 1 ? "has" : "have"} received recognized awards.`;
    }
    case "bloomSize": {
      const largest = getMaximum(rows, (match) => match.bloomSizeIn);
      return largest === null
        ? null
        : `Your largest recorded bloom is ${largest.toLocaleString()} inches.`;
    }
    case "scapeHeight": {
      const tallest = getMaximum(rows, (match) => match.scapeHeightIn);
      return tallest === null
        ? null
        : `Your tallest registered scape is ${tallest.toLocaleString()} inches.`;
    }
    case "bloomHabit": {
      const rebloomers = rows.filter(
        (row) => row.match?.rebloom === true,
      ).length;
      return rebloomers > 0
        ? `${formatCultivarCount(rebloomers)} ${rebloomers === 1 ? "is" : "are"} registered as reblooming.`
        : `${topLabel} is the most common bloom behavior in your collection.`;
    }
    case "budCount": {
      const highest = getMaximum(rows, (match) => match.budCount);
      return highest === null
        ? null
        : `Your highest registered bud count is ${highest.toLocaleString()}.`;
    }
    case "branches": {
      const highest = getMaximum(rows, (match) => match.branches);
      return highest === null
        ? null
        : `Your highest registered branch count is ${highest.toLocaleString()}.`;
    }
    case "fragrance": {
      const recorded = rows.filter(
        (row) => splitFacetValue(row.match?.fragrance).length > 0,
      ).length;
      return `${formatCultivarCount(recorded)} ${recorded === 1 ? "has" : "have"} fragrance recorded.`;
    }
    case "bloomSeason":
      return `${topLabel} is your most common bloom season.`;
    case "form":
      return `${topLabel} is your most common flower form.`;
    case "ploidy":
      return `${topLabel} is the most common ploidy in your collection.`;
    case "foliageType":
      return `${topLabel} is the most common foliage type in your collection.`;
    case "flowerShow":
      return `${topLabel} is your most common flower show classification.`;
    case "sculptedType":
      return `${topLabel} is your most common sculpted form.`;
  }
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
  const summary = selected
    ? getInsightSummary({
        facet: selected.facet,
        ranking: selected.ranking,
        rows: uniqueRows,
      })
    : null;

  return (
    <section
      id="catalog-importer-insights"
      aria-labelledby="catalog-importer-analysis-heading"
      className="!scroll-mt-16"
    >
      <h2
        id="catalog-importer-analysis-heading"
        className="text-xl font-semibold tracking-tight"
      >
        Collection insights
      </h2>
      <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          {uniqueRows.length.toLocaleString()} linked{" "}
          {uniqueRows.length === 1 ? "cultivar" : "cultivars"}
        </span>
        <span>
          {referencePhotoCount.toLocaleString()}{" "}
          {referencePhotoCount === 1 ? "photo" : "photos"}
        </span>
        {awardWinningCount > 0 && awardWinningCount < uniqueRows.length ? (
          <a
            href="#catalog-importer-preview"
            onClick={() => {
              onApplyFilter({ id: "award", value: awardFilters });
            }}
            className="hover:text-primary focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2"
          >
            {awardWinningCount.toLocaleString()} award winning
          </a>
        ) : awardWinningCount > 0 ? (
          <span>{awardWinningCount.toLocaleString()} award winning</span>
        ) : null}
        {earliestYear !== null && latestYear !== null ? (
          <span>
            {earliestYear === latestYear
              ? `Registered ${earliestYear}`
              : `${earliestYear}–${latestYear}`}
          </span>
        ) : null}
      </div>
      {selected ? (
        <div className="mt-4 space-y-3">
          {availableRankings.length > 1 ? (
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
          ) : null}

          <div aria-live="polite">
            {summary ? (
              <p className="mb-3 max-w-2xl text-sm font-medium">{summary}</p>
            ) : null}
            <h3 className="font-medium">{selected.facet.title}</h3>
            <ol className="mt-3 space-y-2">
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
                    className="focus-visible:ring-ring grid grid-cols-[minmax(6rem,11rem)_minmax(4rem,1fr)_auto] items-center gap-3 rounded-sm outline-none hover:opacity-80 focus-visible:ring-2"
                  >
                    <span className="truncate font-medium" title={label}>
                      {label}
                    </span>
                    <span className="bg-muted h-2.5 overflow-hidden rounded-full">
                      <span
                        data-testid="catalog-analysis-bar"
                        className="bg-primary block h-full min-w-1 rounded-full"
                        style={{ width: `${(count / largestCount) * 100}%` }}
                      />
                    </span>
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
