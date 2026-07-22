"use client";

import { type KeyboardEvent, useMemo } from "react";
import {
  Award,
  CalendarRange,
  Diameter,
  Dna,
  Flower2,
  GitBranch,
  Leaf,
  Repeat2,
  Ruler,
  Shapes,
  Sprout,
  Sun,
  Trophy,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  splitFacetValue,
  splitFormFacetValue,
} from "@/components/public-catalog-search/public-catalog-search-filter-utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
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
  view: AnalysisView;
}

export type AnalysisView =
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
  chart: "cloud" | "distribution" | "donut" | "ranked";
  filterId: CatalogImporterInsightFilter["id"];
  icon: LucideIcon;
  label: string;
  maxValues?: number;
  order?: string[];
  title: string;
  value: AnalysisView;
  filterValue: (label: string) => CatalogImporterInsightFilter["value"];
  values: (match: CultivarMatchCandidate) => string[];
}

interface InsightChartDatum {
  axisLabel?: string;
  count: number;
  fill?: string;
  filterValue?: CatalogImporterInsightFilter["value"];
  label: string;
}

interface WordCloudPlacement extends InsightChartDatum {
  fontSize: number;
  height: number;
  width: number;
  x: number;
  y: number;
}

const WORD_CLOUD_WIDTH = 1_000;
const WORD_CLOUD_HEIGHT = 340;
const WORD_CLOUD_PADDING = 8;

const INSIGHT_CHART_CONFIG = {
  count: {
    label: "Cultivars",
    color: "var(--chart-1)",
  },
  value: {
    label: "Value",
  },
} satisfies ChartConfig;

const INSIGHT_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const BLOOM_SEASON_ORDER = [
  "Extra Early",
  "Early",
  "Early-Midseason",
  "Midseason",
  "Mid-Late",
  "Late-Midseason",
  "Late",
  "Very Late",
];

const FLOWER_SHOW_ORDER = [
  "Miniature",
  "Small",
  "Large",
  "Extra-Large",
  "Extra Large",
  "Double/Poly",
  "Spider",
  "Unusual Form",
  "Seedling",
];

function getExactNumericValue(value: number | null | undefined) {
  return value === null || value === undefined ? [] : [String(value)];
}

function getExactNumericFilter(label: string) {
  return `${label}:${label}`;
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
    chart: "cloud",
    filterId: "hybridizer",
    icon: Users,
    label: "By hybridizer",
    maxValues: 20,
    title: "Top hybridizers",
    value: "hybridizer",
    filterValue: (label) => [label],
    values: (match) => (match.hybridizer ? [match.hybridizer] : []),
  },
  {
    chart: "distribution",
    filterId: "year",
    icon: CalendarRange,
    label: "By year",
    title: "Registration years",
    value: "year",
    filterValue: (label) => `${label}:${label}`,
    values: (match) => (match.year === null ? [] : [String(match.year)]),
  },
  {
    chart: "ranked",
    filterId: "award",
    icon: Award,
    label: "Award winning",
    title: "Top awards",
    value: "awards",
    filterValue: (label) => [getAwardCode(label)],
    values: (match) =>
      splitFacetValue(match.awardNames).map(getAwardDisplayName),
  },
  {
    chart: "donut",
    filterId: "ploidy",
    icon: Dna,
    label: "By ploidy",
    title: "Ploidy",
    value: "ploidy",
    filterValue: (label) => [label],
    values: (match) => (match.ploidy ? [match.ploidy] : []),
  },
  {
    chart: "ranked",
    filterId: "bloomSeason",
    icon: Sun,
    label: "Bloom season",
    order: BLOOM_SEASON_ORDER,
    title: "Bloom seasons",
    value: "bloomSeason",
    filterValue: (label) => [label],
    values: (match) => (match.bloomSeason ? [match.bloomSeason] : []),
  },
  {
    chart: "ranked",
    filterId: "form",
    icon: Flower2,
    label: "Flower form",
    title: "Flower forms",
    value: "form",
    filterValue: (label) => [label],
    values: (match) => splitFormFacetValue(match.form),
  },
  {
    chart: "distribution",
    filterId: "bloomSize",
    icon: Diameter,
    label: "Bloom size",
    title: "Bloom size distribution",
    value: "bloomSize",
    filterValue: getExactNumericFilter,
    values: (match) => getExactNumericValue(match.bloomSizeIn),
  },
  {
    chart: "distribution",
    filterId: "scapeHeight",
    icon: Ruler,
    label: "Scape height",
    title: "Scape height distribution",
    value: "scapeHeight",
    filterValue: getExactNumericFilter,
    values: (match) => getExactNumericValue(match.scapeHeightIn),
  },
  {
    chart: "ranked",
    filterId: "bloomHabit",
    icon: Repeat2,
    label: "Bloom behavior",
    title: "Bloom behavior",
    value: "bloomHabit",
    filterValue: (label) => [label],
    values: getBloomHabitValues,
  },
  {
    chart: "ranked",
    filterId: "fragrance",
    icon: Wind,
    label: "Fragrance",
    title: "Fragrance",
    value: "fragrance",
    filterValue: (label) => [label],
    values: (match) => splitFacetValue(match.fragrance),
  },
  {
    chart: "donut",
    filterId: "foliageType",
    icon: Leaf,
    label: "Foliage type",
    title: "Foliage types",
    value: "foliageType",
    filterValue: (label) => [label],
    values: (match) => splitFacetValue(match.foliageType),
  },
  {
    chart: "ranked",
    filterId: "flowerShow",
    icon: Trophy,
    label: "Flower show",
    order: FLOWER_SHOW_ORDER,
    title: "Flower show classifications",
    value: "flowerShow",
    filterValue: (label) => [label],
    values: (match) => splitFacetValue(match.flowerShow),
  },
  {
    chart: "ranked",
    filterId: "sculptedType",
    icon: Shapes,
    label: "Sculpting",
    title: "Sculpted forms",
    value: "sculptedType",
    filterValue: (label) => [label],
    values: (match) => splitFacetValue(match.sculptedTypes),
  },
  {
    chart: "distribution",
    filterId: "budcount",
    icon: Sprout,
    label: "Bud count",
    title: "Bud count distribution",
    value: "budCount",
    filterValue: getExactNumericFilter,
    values: (match) => getExactNumericValue(match.budCount),
  },
  {
    chart: "distribution",
    filterId: "branches",
    icon: GitBranch,
    label: "Branch count",
    title: "Branch count distribution",
    value: "branches",
    filterValue: getExactNumericFilter,
    values: (match) => getExactNumericValue(match.branches),
  },
];

export function isCatalogImporterAnalysisView(
  value: string | null,
): value is AnalysisView {
  return ANALYSIS_FACETS.some((facet) => facet.value === value);
}

const MAX_VALUES = 5;
const MAX_DISTRIBUTION_BUCKETS = 8;
const MAX_YEAR_BUCKETS = 20;

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

  const orderByLabel = new Map(
    facet.order?.map((label, index) => [label.toLowerCase(), index]),
  );
  const allValues = [...counts.entries()].sort((left, right) => {
    if (facet.chart === "distribution") {
      return Number(left[0]) - Number(right[0]);
    }
    if (orderByLabel.size > 0) {
      const leftIndex = orderByLabel.get(left[0].toLowerCase());
      const rightIndex = orderByLabel.get(right[0].toLowerCase());
      if (leftIndex !== undefined || rightIndex !== undefined) {
        return (
          (leftIndex ?? Number.POSITIVE_INFINITY) -
          (rightIndex ?? Number.POSITIVE_INFINITY)
        );
      }
    }
    return right[1] - left[1] || left[0].localeCompare(right[0]);
  });

  return {
    allValues,
    values:
      facet.chart === "distribution" || facet.order
        ? allValues
        : allValues.slice(0, facet.maxValues ?? MAX_VALUES),
  };
}

function getNiceBucketSize(
  range: number,
  integerValues: boolean,
  maximumBuckets: number,
) {
  if (range <= 0) return integerValues ? 1 : 0.5;
  const target = range / (maximumBuckets - 1);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const multiplier =
    normalized <= 1.5 ? 1 : normalized <= 3 ? 2 : normalized <= 7 ? 5 : 10;
  return Math.max(integerValues ? 1 : Number.EPSILON, multiplier * magnitude);
}

function formatBucketValue(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}

function getDistributionData(
  values: [string, number][],
  facet: AnalysisFacet,
): InsightChartDatum[] {
  const numericValues = values.map(([label, count]) => ({
    count,
    value: Number(label),
  }));
  if (numericValues.length === 0) return [];

  const minimum = numericValues[0]?.value ?? 0;
  const maximum = numericValues.at(-1)?.value ?? minimum;
  const integerValues = numericValues.every(({ value }) =>
    Number.isInteger(value),
  );
  const bucketSize = getNiceBucketSize(
    maximum - minimum,
    integerValues,
    facet.value === "year" ? MAX_YEAR_BUCKETS : MAX_DISTRIBUTION_BUCKETS,
  );
  const buckets = new Map<
    number,
    { count: number; maximum: number; minimum: number }
  >();

  for (const item of numericValues) {
    const bucketStart = Math.floor(item.value / bucketSize) * bucketSize;
    const bucket = buckets.get(bucketStart);
    buckets.set(bucketStart, {
      count: (bucket?.count ?? 0) + item.count,
      maximum: Math.max(bucket?.maximum ?? item.value, item.value),
      minimum: Math.min(bucket?.minimum ?? item.value, item.value),
    });
  }

  const firstBucketStart = Math.floor(minimum / bucketSize) * bucketSize;
  const lastBucketStart = Math.floor(maximum / bucketSize) * bucketSize;
  const bucketCount =
    Math.round((lastBucketStart - firstBucketStart) / bucketSize) + 1;

  return Array.from({ length: bucketCount }, (_, index) => {
    const start = firstBucketStart + index * bucketSize;
    const bucket = buckets.get(start);
    const end = start + bucketSize;
    const label =
      minimum === maximum || bucketSize === 1
        ? formatBucketValue(start)
        : integerValues
          ? `${formatBucketValue(start)}–${formatBucketValue(end - 1)}`
          : `${formatBucketValue(start)}–<${formatBucketValue(end)}`;

    return {
      axisLabel: facet.value === "year" ? formatBucketValue(start) : label,
      count: bucket?.count ?? 0,
      filterValue: bucket
        ? `${formatBucketValue(bucket.minimum)}:${formatBucketValue(bucket.maximum)}`
        : `${formatBucketValue(start)}:${formatBucketValue(integerValues ? end - 1 : end)}`,
      label,
    };
  });
}

function formatCultivarCount(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "cultivar" : "cultivars"}`;
}

function getNumericStats(
  rows: CatalogImportRow[],
  value: (match: CultivarMatchCandidate) => number | null | undefined,
) {
  const values = rows
    .map((row) => (row.match ? value(row.match) : null))
    .filter((item): item is number => item !== null && item !== undefined)
    .sort((left, right) => left - right);
  if (values.length === 0) return null;

  const middle = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0
      ? ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2
      : (values[middle] ?? 0);

  return {
    max: values.at(-1) ?? 0,
    median,
    min: values[0] ?? 0,
  };
}

function formatNumericSummary({
  label,
  stats,
  unit = "",
}: {
  label: string;
  stats: ReturnType<typeof getNumericStats>;
  unit?: string;
}) {
  if (!stats) return null;
  const formattedUnit = unit ? ` ${unit}` : "";
  if (stats.min === stats.max) {
    return `Every recorded ${label} is ${stats.min.toLocaleString()}${formattedUnit}.`;
  }
  return `The median ${label} is ${stats.median.toLocaleString()}${formattedUnit}, ranging from ${stats.min.toLocaleString()} to ${stats.max.toLocaleString()}${formattedUnit}.`;
}

function formatChartCount(value: number) {
  return `${value.toLocaleString()} ${value === 1 ? "cultivar" : "cultivars"}`;
}

function InsightChartTable({
  data,
  title,
}: {
  data: InsightChartDatum[];
  title: string;
}) {
  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">Value</th>
          <th scope="col">Cultivars</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.label}>
            <th scope="row">{item.label}</th>
            <td>{item.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InsightAxisTick({
  axis,
  data,
  onSelect,
  payload,
  x = 0,
  y = 0,
}: {
  axis: "x" | "y";
  data: InsightChartDatum[];
  onSelect: (item: InsightChartDatum) => void;
  payload?: { value?: number | string };
  x?: number;
  y?: number;
}) {
  const label = String(payload?.value ?? "");
  const item = data.find((candidate) => candidate.label === label);
  if (!item) return null;

  const selectItem = () => onSelect(item);
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectItem();
  };

  return (
    <g
      aria-label={`Filter catalog by ${item.label}`}
      className="group cursor-pointer outline-none"
      onClick={selectItem}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      transform={`translate(${x},${y})`}
    >
      <title>{`Filter catalog by ${item.label}`}</title>
      <text
        className="fill-muted-foreground group-hover:fill-foreground group-focus-visible:fill-foreground"
        dy={axis === "y" ? "0.32em" : "1.1em"}
        textAnchor={axis === "y" ? "end" : "middle"}
        x={axis === "y" ? -8 : 0}
      >
        {item.axisLabel ?? item.label}
      </text>
    </g>
  );
}

function RankedInsightChart({
  data,
  onSelect,
  title,
}: {
  data: InsightChartDatum[];
  onSelect: (item: InsightChartDatum) => void;
  title: string;
}) {
  return (
    <div className="min-w-0">
      <ChartContainer
        config={INSIGHT_CHART_CONFIG}
        className="h-56 w-full min-w-0 overflow-hidden"
        aria-label={`${title} chart`}
      >
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ left: 4, right: 56 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            axisLine={false}
            dataKey="label"
            tick={<InsightAxisTick axis="y" data={data} onSelect={onSelect} />}
            tickLine={false}
            tickMargin={8}
            type="category"
            width={150}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                formatter={(value) => formatChartCount(Number(value))}
              />
            }
          />
          <Bar
            className="text-primary cursor-pointer"
            dataKey="count"
            fill="currentColor"
            radius={4}
            onClick={(_, index) => {
              const item = data[index];
              if (item) onSelect(item);
            }}
          >
            <LabelList
              className="fill-foreground"
              dataKey="count"
              position="right"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <InsightChartTable data={data} title={title} />
    </div>
  );
}

function DistributionInsightChart({
  data,
  onSelect,
  title,
}: {
  data: InsightChartDatum[];
  onSelect: (item: InsightChartDatum) => void;
  title: string;
}) {
  return (
    <div className="min-w-0">
      <ChartContainer
        config={INSIGHT_CHART_CONFIG}
        className="h-60 w-full min-w-0 overflow-hidden"
        aria-label={`${title} chart`}
      >
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ left: 8, right: 32, top: 16 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={12}
            tick={<InsightAxisTick axis="x" data={data} onSelect={onSelect} />}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                formatter={(value) => formatChartCount(Number(value))}
              />
            }
          />
          <Bar
            className="text-primary cursor-pointer"
            dataKey="count"
            fill="currentColor"
            radius={[4, 4, 0, 0]}
            onClick={(_, index) => {
              const item = data[index];
              if (item) onSelect(item);
            }}
          />
        </BarChart>
      </ChartContainer>
      <InsightChartTable data={data} title={title} />
    </div>
  );
}

function estimateWordWidth(label: string, fontSize: number) {
  return [...label].reduce((width, character) => {
    if (character === " ") return width + fontSize * 0.32;
    if (/[ilI1.'-]/.test(character)) return width + fontSize * 0.3;
    if (/[mwMW@]/.test(character)) return width + fontSize * 0.82;
    if (/[A-Z]/.test(character)) return width + fontSize * 0.64;
    return width + fontSize * 0.53;
  }, 0);
}

function hashWord(label: string) {
  return [...label].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
}

function placementsOverlap(
  candidate: WordCloudPlacement,
  placed: WordCloudPlacement[],
) {
  return placed.some(
    (item) =>
      Math.abs(candidate.x - item.x) <
        (candidate.width + item.width) / 2 + WORD_CLOUD_PADDING &&
      Math.abs(candidate.y - item.y) <
        (candidate.height + item.height) / 2 + WORD_CLOUD_PADDING,
  );
}

function getWordCloudLayout(data: InsightChartDatum[]) {
  const maximum = Math.max(...data.map((item) => item.count));
  const minimum = Math.min(...data.map((item) => item.count));
  const range = Math.max(maximum - minimum, 1);
  const placed: WordCloudPlacement[] = [];

  for (const [index, item] of data.entries()) {
    const prominence = (item.count - minimum) / range;
    const idealFontSize = 25 + Math.sqrt(prominence) * 39;
    const startAngle = ((hashWord(item.label) % 360) * Math.PI) / 180;
    let placement: WordCloudPlacement | null = null;

    for (const scale of [1, 0.92, 0.84, 0.76]) {
      const fontSize = idealFontSize * scale;
      const width = estimateWordWidth(item.label, fontSize);
      const height = fontSize * 1.05;

      for (let step = 0; step < 2_400; step += 1) {
        const angle = startAngle + step * 0.19;
        const radius = index === 0 ? 0 : 5 + step * 0.55;
        const candidate: WordCloudPlacement = {
          ...item,
          fontSize,
          height,
          width,
          x: WORD_CLOUD_WIDTH / 2 + Math.cos(angle) * radius,
          y: WORD_CLOUD_HEIGHT / 2 + Math.sin(angle) * radius * 0.48,
        };
        const withinBounds =
          candidate.x - width / 2 >= WORD_CLOUD_PADDING &&
          candidate.x + width / 2 <= WORD_CLOUD_WIDTH - WORD_CLOUD_PADDING &&
          candidate.y - height / 2 >= WORD_CLOUD_PADDING &&
          candidate.y + height / 2 <= WORD_CLOUD_HEIGHT - WORD_CLOUD_PADDING;

        if (withinBounds && !placementsOverlap(candidate, placed)) {
          placement = candidate;
          break;
        }
      }

      if (placement) break;
    }

    if (placement) placed.push(placement);
  }

  return placed;
}

function WordCloudInsightChart({
  data,
  onSelect,
  title,
}: {
  data: InsightChartDatum[];
  onSelect: (item: InsightChartDatum) => void;
  title: string;
}) {
  const layout = useMemo(() => getWordCloudLayout(data), [data]);

  return (
    <div className="max-w-5xl min-w-0">
      <svg
        aria-label={`${title} word cloud`}
        className="h-auto max-h-80 min-h-56 w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        viewBox={`0 0 ${WORD_CLOUD_WIDTH} ${WORD_CLOUD_HEIGHT}`}
      >
        {layout.map((item, index) => (
          <g
            aria-label={`${item.label}, ${formatChartCount(item.count)}`}
            className="group cursor-pointer outline-none"
            key={item.label}
            onClick={() => onSelect(item)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(item);
              }
            }}
            role="button"
            tabIndex={0}
            transform={`translate(${item.x} ${item.y})`}
          >
            <title>{`${item.label}: ${formatChartCount(item.count)}`}</title>
            <rect
              className="group-focus-visible:fill-accent fill-transparent"
              height={item.height + WORD_CLOUD_PADDING}
              rx={6}
              width={item.width + WORD_CLOUD_PADDING * 2}
              x={-item.width / 2 - WORD_CLOUD_PADDING}
              y={-item.height / 2 - WORD_CLOUD_PADDING / 2}
            />
            <text
              className="fill-primary group-focus-visible:fill-accent-foreground select-none"
              dominantBaseline="central"
              fontSize={item.fontSize}
              fontWeight={index < 5 ? 700 : 600}
              opacity={Math.max(0.68, 1 - index * 0.018)}
              textAnchor="middle"
            >
              {item.label}
            </text>
          </g>
        ))}
      </svg>
      <InsightChartTable data={data} title={title} />
    </div>
  );
}

function DonutInsightChart({
  data,
  onSelect,
  title,
}: {
  data: InsightChartDatum[];
  onSelect: (item: InsightChartDatum) => void;
  title: string;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex max-w-2xl min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
      <ChartContainer
        config={INSIGHT_CHART_CONFIG}
        className="h-48 w-48 shrink-0 overflow-hidden"
        aria-label={`${title} chart`}
      >
        <PieChart accessibilityLayer>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                nameKey="label"
                formatter={(value) => formatChartCount(Number(value))}
              />
            }
          />
          <Pie
            data={data}
            dataKey="count"
            innerRadius={46}
            nameKey="label"
            onClick={(_, index) => {
              const item = data[index];
              if (item) onSelect(item);
            }}
            outerRadius={72}
            paddingAngle={2}
            strokeWidth={2}
          >
            {data.map((item) => (
              <Cell
                className="cursor-pointer"
                fill={item.fill}
                key={item.label}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="flex w-full max-w-sm min-w-0 flex-col gap-1">
        {data.map((item) => (
          <li key={item.label}>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start gap-2 px-2 font-normal"
              onClick={() => onSelect(item)}
            >
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.fill }}
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {item.count.toLocaleString()} ·{" "}
                {Math.round((item.count / total) * 100)}%
              </span>
            </Button>
          </li>
        ))}
      </ul>
      <InsightChartTable data={data} title={title} />
    </div>
  );
}

function InsightChart({
  data,
  facet,
  onSelect,
}: {
  data: InsightChartDatum[];
  facet: AnalysisFacet;
  onSelect: (item: InsightChartDatum) => void;
}) {
  if (data.length <= 1) {
    return null;
  }

  if (data.length <= 4) {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    return (
      <ul className="max-w-xl divide-y border-y">
        {data.map((item) => (
          <li key={item.label}>
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-between rounded-none px-1 py-2.5 font-normal"
              onClick={() => onSelect(item)}
            >
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {item.count.toLocaleString()} ·{" "}
                {Math.round((item.count / total) * 100)}%
              </span>
            </Button>
          </li>
        ))}
      </ul>
    );
  }

  if (facet.chart === "distribution") {
    return (
      <DistributionInsightChart
        data={data}
        onSelect={onSelect}
        title={facet.title}
      />
    );
  }

  if (facet.chart === "cloud") {
    return (
      <WordCloudInsightChart
        data={data}
        onSelect={onSelect}
        title={facet.title}
      />
    );
  }

  if (facet.chart === "donut") {
    return (
      <DonutInsightChart data={data} onSelect={onSelect} title={facet.title} />
    );
  }

  return (
    <RankedInsightChart data={data} onSelect={onSelect} title={facet.title} />
  );
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
      return formatNumericSummary({
        label: "bloom size",
        stats: getNumericStats(rows, (match) => match.bloomSizeIn),
        unit: "inches",
      });
    }
    case "scapeHeight": {
      return formatNumericSummary({
        label: "scape height",
        stats: getNumericStats(rows, (match) => match.scapeHeightIn),
        unit: "inches",
      });
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
      return formatNumericSummary({
        label: "bud count",
        stats: getNumericStats(rows, (match) => match.budCount),
      });
    }
    case "branches": {
      return formatNumericSummary({
        label: "branch count",
        stats: getNumericStats(rows, (match) => match.branches),
      });
    }
    case "fragrance": {
      const recorded = rows.filter(
        (row) => splitFacetValue(row.match?.fragrance).length > 0,
      ).length;
      return `${formatCultivarCount(recorded)} ${recorded === 1 ? "has" : "have"} fragrance recorded.`;
    }
    case "bloomSeason":
      return `${topLabel} is your most common bloom season, with ${formatCultivarCount(topCount)}.`;
    case "form":
      return `${topLabel} is your most common flower form, with ${formatCultivarCount(topCount)}.`;
    case "ploidy":
      return `${topLabel} represents ${Math.round((topCount / rows.length) * 100)}% of your linked cultivars.`;
    case "foliageType":
      return `${topLabel} represents ${Math.round((topCount / rows.length) * 100)}% of your linked cultivars.`;
    case "flowerShow":
      return `${topLabel} is your most common flower show classification, with ${formatCultivarCount(topCount)}.`;
    case "sculptedType":
      return `${topLabel} is your most common sculpted form, with ${formatCultivarCount(topCount)}.`;
  }
}

export function CatalogImporterAnalysis({
  onApplyFilter,
  onViewChange,
  rows,
  view,
}: {
  onApplyFilter: (filter: CatalogImporterInsightFilter) => void;
  onViewChange: (view: AnalysisView) => void;
  rows: CatalogImportRow[];
  view: AnalysisView;
}) {
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

  const summary = selected
    ? getInsightSummary({
        facet: selected.facet,
        ranking: selected.ranking,
        rows: uniqueRows,
      })
    : null;
  const chartData = selected
    ? selected.facet.chart === "distribution"
      ? getDistributionData(selected.ranking.allValues, selected.facet)
      : selected.ranking.values.map(([label, count], index) => ({
          count,
          label,
          ...(selected.facet.chart === "donut"
            ? {
                fill: INSIGHT_CHART_COLORS[index % INSIGHT_CHART_COLORS.length],
              }
            : {}),
        }))
    : [];
  const selectChartValue = (item: InsightChartDatum) => {
    if (!selected) return;
    onApplyFilter({
      id: selected.facet.filterId,
      value: item.filterValue ?? selected.facet.filterValue(item.label),
      view: selected.facet.value,
    });
    document.getElementById("catalog-importer-preview")?.scrollIntoView?.();
  };

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
              onApplyFilter({
                id: "award",
                value: awardFilters,
                view: "awards",
              });
            }}
            className="hover:text-primary focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2"
          >
            {awardWinningCount.toLocaleString()} award-winning{" "}
            {awardWinningCount === 1 ? "cultivar" : "cultivars"}
          </a>
        ) : awardWinningCount > 0 ? (
          <span>
            {awardWinningCount.toLocaleString()} award-winning{" "}
            {awardWinningCount === 1 ? "cultivar" : "cultivars"}
          </span>
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
                if (nextView) onViewChange(nextView as AnalysisView);
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
              <ItemGroup className="mb-3 max-w-2xl">
                <Item size="sm" variant="muted">
                  <ItemMedia variant="icon">
                    <selected.facet.icon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{summary}</ItemTitle>
                  </ItemContent>
                </Item>
              </ItemGroup>
            ) : null}
            <h3 className="font-medium">{selected.facet.title}</h3>
            <div className="mt-3">
              <InsightChart
                data={chartData}
                facet={selected.facet}
                onSelect={selectChartValue}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
