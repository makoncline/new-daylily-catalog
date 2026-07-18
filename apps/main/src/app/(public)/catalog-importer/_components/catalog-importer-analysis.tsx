"use client";

import { useMemo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  CatalogImportRow,
  CultivarMatchCandidate,
} from "@/lib/catalog-importer";

type AnalysisView =
  | "awards"
  | "bloomSeason"
  | "form"
  | "hybridizer"
  | "ploidy"
  | "year";

interface AnalysisFacet {
  label: string;
  title: string;
  value: AnalysisView;
  values: (match: CultivarMatchCandidate) => string[];
}

const ANALYSIS_FACETS: AnalysisFacet[] = [
  {
    label: "By hybridizer",
    title: "Top hybridizers",
    value: "hybridizer",
    values: (match) => (match.hybridizer ? [match.hybridizer] : []),
  },
  {
    label: "By year",
    title: "Top registration years",
    value: "year",
    values: (match) => (match.year === null ? [] : [String(match.year)]),
  },
  {
    label: "Award winning",
    title: "Top awards",
    value: "awards",
    values: (match) => splitValues(match.awardNames),
  },
  {
    label: "By ploidy",
    title: "Ploidy",
    value: "ploidy",
    values: (match) => (match.ploidy ? [match.ploidy] : []),
  },
  {
    label: "Bloom season",
    title: "Bloom seasons",
    value: "bloomSeason",
    values: (match) => (match.bloomSeason ? [match.bloomSeason] : []),
  },
  {
    label: "Flower form",
    title: "Flower forms",
    value: "form",
    values: (match) => splitValues(match.form),
  },
];

const MAX_VALUES = 7;

function splitValues(value: string | null | undefined) {
  return value
    ? value
        .split(/\s*[|;,]\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
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
  rows,
}: {
  rows: CatalogImportRow[];
}) {
  const [view, setView] = useState<AnalysisView>("hybridizer");
  const availableRankings = useMemo(
    () =>
      ANALYSIS_FACETS.map((facet) => ({
        facet,
        ranking: getRankedValues(rows, facet),
      })).filter(({ ranking }) => ranking.values.length > 0),
    [rows],
  );
  const selected =
    availableRankings.find(({ facet }) => facet.value === view) ??
    availableRankings[0];

  if (!selected) {
    return null;
  }

  const { facet, ranking } = selected;
  const largestCount = Math.max(1, ...ranking.values.map(([, count]) => count));

  return (
    <section
      aria-labelledby="catalog-importer-analysis-heading"
      className="border-t pt-10"
    >
      <h2
        id="catalog-importer-analysis-heading"
        className="text-xl font-semibold tracking-tight"
      >
        Explore your catalog
      </h2>
      <div className="mt-5 space-y-4">
        <ToggleGroup
          type="single"
          value={facet.value}
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
          <h3 className="font-medium">{facet.title}</h3>
          <ol className="mt-4 space-y-3">
            {ranking.values.map(([label, count]) => (
              <li
                key={label}
                aria-label={`${label}: ${count.toLocaleString()} listings`}
                className="grid grid-cols-[minmax(6rem,11rem)_minmax(4rem,1fr)_auto] items-center gap-3 text-sm"
              >
                <span className="truncate font-medium" title={label}>
                  {label}
                </span>
                <span className="bg-muted h-2.5 overflow-hidden rounded-full">
                  <span
                    className="bg-primary block h-full min-w-1 rounded-full"
                    style={{ width: `${(count / largestCount) * 100}%` }}
                  />
                </span>
                <span className="text-muted-foreground min-w-8 text-right tabular-nums">
                  {count.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
