"use client";

// eslint-disable react/no-unknown-property -- Next styled-jsx uses jsx/global attributes.

import Image from "next/image";
import Link from "next/link";
import { Camera, ChevronDown, LoaderCircle, RotateCcw } from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type PublicCatalogSearchFilterChip,
  PublicCatalogSearchFilterChipList,
  PublicCatalogSearchModeToggle,
  PublicCatalogSearchQueryInput,
  PublicCatalogSearchSection,
} from "@/components/public-catalog-search/public-catalog-search-composable";
import {
  PublicCatalogSearchBooleanFilter,
  PublicCatalogSearchFacetFilter,
  PublicCatalogSearchRangeFilter,
  PublicCatalogSearchTextFilter,
  type PublicCatalogSearchRangeBounds,
} from "@/components/public-catalog-search/public-catalog-search-panel-controls";
import { type NumericRange } from "@/components/public-catalog-search/public-catalog-search-filter-utils";
import {
  getPublicCatalogSearchFilterDefinition,
  type PublicCatalogSearchFilterDefinition,
} from "@/components/public-catalog-search/public-catalog-search-registry";
import { type PublicCatalogSearchFacetOption } from "@/components/public-catalog-search/public-catalog-search-types";
import { OptimizedImage } from "@/components/optimized-image";
import { Button } from "@/components/ui/button";
import { getCultivarSearchTelemetryProperties } from "@/lib/analytics/cultivar-search-telemetry";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { useIsMobile } from "@/hooks/use-mobile";
import { hasAdvancedCultivarSearchState } from "../_lib/cultivar-search-url";

const PAGE_SIZE = 24;
const RESTORATION_STORAGE_KEY = "cultivar-search:return-snapshot:v1";
const HISTORY_ENTRY_KEY = "cultivarSearchEntryId";
const RESTORATION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

type CultivarSort = "relevance" | "name" | "newest" | "oldest" | "mostListed";

interface InitialCultivarSearchState {
  advanced?: boolean;
  bloomHabit?: string;
  bloomSizeMax?: string;
  bloomSizeMin?: string;
  bloomSeason?: string;
  branchesMax?: string;
  branchesMin?: string;
  budCountMax?: string;
  budCountMin?: string;
  color?: string;
  cultivarName?: string;
  foliageType?: string;
  form?: string;
  fragrance?: string;
  hasCultivarPhoto: boolean;
  hasForSaleListings: boolean;
  hasListings: boolean;
  hybridizer?: string;
  parentage?: string;
  photosFirst?: boolean;
  ploidy?: string;
  q: string;
  scapeHeightMax?: string;
  scapeHeightMin?: string;
  sort?: string;
  yearMax?: string;
  yearMin?: string;
}

interface CultivarSearchFilters {
  bloomHabit: string;
  bloomSizeMax: string;
  bloomSizeMin: string;
  bloomSeason: string;
  branchesMax: string;
  branchesMin: string;
  budCountMax: string;
  budCountMin: string;
  color: string;
  cultivarName: string;
  foliageType: string;
  form: string;
  fragrance: string;
  hasCultivarPhoto: boolean;
  hasForSaleListings: boolean;
  hasListings: boolean;
  hybridizer: string;
  parentage: string;
  ploidy: string;
  scapeHeightMax: string;
  scapeHeightMin: string;
  yearMax: string;
  yearMin: string;
}

interface CultivarSearchResult {
  canonicalUrl: string | null;
  cultivarReferenceId: string;
  imageAsset: {
    blurUrl: string | null;
    displayUrl: string | null;
    id: string;
    originalUrl: string | null;
    status: string | null;
    thumbUrl: string | null;
  } | null;
  imageUrl: string | null;
  listingSummary: {
    catalogsWithListings: number;
    forSaleListings: number;
  };
  matchedOn: string | null;
  name: string;
  normalizedName: string;
  traits: {
    bloomSeason: string | null;
    bloomSizeIn: number | null;
    color: string | null;
    foliageType: string | null;
    form: string | null;
    hybridizer: string | null;
    ploidy: string | null;
    rebloom: boolean | null;
    scapeHeightIn: number | null;
    year: number | null;
  };
}

interface CultivarSearchResponse {
  pagination: {
    hasMore: boolean;
    limit: number;
    nextOffset: number | null;
  };
  results: CultivarSearchResult[];
}

type SearchRequestKind = "initial" | "load_more" | "refinement" | "retry";
type SearchTelemetryOutcome =
  | "empty"
  | "error"
  | "index_unavailable"
  | "results";

interface SearchResponseTelemetry {
  httpStatus: number;
  requestId: string | undefined;
  serverDurationMs: number | undefined;
}

interface CultivarSearchReturnSnapshot {
  entryId: string;
  nextOffset: number | null;
  results: CultivarSearchResult[];
  savedAt: number;
  scrollAnchor: {
    cultivarReferenceId: string;
    viewportOffset: number;
  } | null;
  scrollY: number;
  url: string;
  version: 2;
}

const EMPTY_FILTERS: CultivarSearchFilters = {
  bloomHabit: "",
  bloomSizeMax: "",
  bloomSizeMin: "",
  bloomSeason: "",
  branchesMax: "",
  branchesMin: "",
  budCountMax: "",
  budCountMin: "",
  color: "",
  cultivarName: "",
  foliageType: "",
  form: "",
  fragrance: "",
  hasCultivarPhoto: false,
  hasForSaleListings: false,
  hasListings: false,
  hybridizer: "",
  parentage: "",
  ploidy: "",
  scapeHeightMax: "",
  scapeHeightMin: "",
  yearMax: "",
  yearMin: "",
};

const SORT_OPTIONS: Array<{ label: string; value: CultivarSort }> = [
  { label: "Best match", value: "relevance" },
  { label: "Newest introductions", value: "newest" },
  { label: "Most listed", value: "mostListed" },
  { label: "Name A–Z", value: "name" },
];

function roundTelemetryDuration(durationMs: number) {
  return Math.round(durationMs * 10) / 10;
}

function getSearchResponseTelemetry(
  response: Response,
): SearchResponseTelemetry {
  const serverDuration = Number.parseFloat(
    response.headers?.get("X-Cultivar-Search-Duration-Ms") ?? "",
  );

  return {
    httpStatus: response.status,
    requestId:
      response.headers?.get("X-Cultivar-Search-Request-Id") ?? undefined,
    serverDurationMs: Number.isFinite(serverDuration)
      ? serverDuration
      : undefined,
  };
}

function captureSearchResultsViewed({
  clientDurationMs,
  hasMore,
  outcome,
  params,
  requestKind,
  responseTelemetry,
  resultsReturned,
  visibleResultCount,
}: {
  clientDurationMs: number;
  hasMore?: boolean;
  outcome: SearchTelemetryOutcome;
  params: URLSearchParams;
  requestKind: SearchRequestKind;
  responseTelemetry: SearchResponseTelemetry;
  resultsReturned?: number;
  visibleResultCount?: number;
}) {
  capturePosthogEvent("public_cultivar_search_results_viewed", {
    ...getCultivarSearchTelemetryProperties(params),
    client_duration_ms: roundTelemetryDuration(clientDurationMs),
    has_more: hasMore,
    http_status: responseTelemetry.httpStatus,
    outcome,
    request_id: responseTelemetry.requestId,
    request_kind: requestKind,
    results_returned: resultsReturned,
    server_duration_ms: responseTelemetry.serverDurationMs,
    visible_result_count: visibleResultCount,
  });
}

const BOOLEAN_FILTER_CHIPS = [
  { key: "hasCultivarPhoto", label: "With photos" },
  { key: "hasListings", label: "In catalogs" },
  { key: "hasForSaleListings", label: "For sale" },
] as const satisfies ReadonlyArray<{
  key: keyof CultivarSearchFilters;
  label: string;
}>;

const TEXT_FILTER_CHIPS = [
  { key: "cultivarName", label: "Cultivar" },
  { key: "hybridizer", label: "Hybridizer" },
  { key: "color", label: "Color" },
  { key: "parentage", label: "Parentage" },
] as const satisfies ReadonlyArray<{
  key: keyof CultivarSearchFilters;
  label: string;
}>;

const FACET_FILTER_CHIPS = [
  { key: "bloomHabit", label: "Bloom habit" },
  { key: "bloomSeason", label: "Bloom season" },
  { key: "form", label: "Form" },
  { key: "ploidy", label: "Ploidy" },
  { key: "foliageType", label: "Foliage type" },
  { key: "fragrance", label: "Fragrance" },
] as const satisfies ReadonlyArray<{
  key: keyof CultivarSearchFilters;
  label: string;
}>;

const RANGE_FILTER_CHIPS: ReadonlyArray<{
  label: string;
  maxKey: keyof CultivarSearchFilters;
  minKey: keyof CultivarSearchFilters;
  prefix?: string;
  suffix?: string;
}> = [
  { label: "Year", maxKey: "yearMax", minKey: "yearMin" },
  {
    label: "Scape height",
    maxKey: "scapeHeightMax",
    minKey: "scapeHeightMin",
    suffix: " in.",
  },
  {
    label: "Bloom size",
    maxKey: "bloomSizeMax",
    minKey: "bloomSizeMin",
    suffix: " in.",
  },
  { label: "Bud count", maxKey: "budCountMax", minKey: "budCountMin" },
  { label: "Branches", maxKey: "branchesMax", minKey: "branchesMin" },
];

function formatFacetChipValue(value: string) {
  return [
    ...new Set(
      value
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
    .sort((left, right) => left.localeCompare(right))
    .join(", ");
}

function formatRangeChipLabel({
  label,
  max,
  min,
  prefix = "",
  suffix = "",
}: {
  label: string;
  max: string;
  min: string;
  prefix?: string;
  suffix?: string;
}) {
  const formatValue = (value: string) => `${prefix}${value}${suffix}`;
  if (min && max) {
    return `${label}: ${formatValue(min)}–${formatValue(max)}`;
  }
  if (min) return `${label}: ${formatValue(min)}+`;
  return `${label}: Up to ${formatValue(max)}`;
}

function isCultivarSort(value: string | undefined): value is CultivarSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function getCurrentUrl() {
  return `${window.location.pathname}${window.location.search}`;
}

function getHistoryState() {
  const state = window.history.state as unknown;
  return state && typeof state === "object"
    ? (state as Record<string, unknown>)
    : {};
}

function createHistoryEntryId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `cultivar-search-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function ensureHistoryEntryId() {
  const state = getHistoryState();
  const existing = state[HISTORY_ENTRY_KEY];
  if (typeof existing === "string" && existing.length > 0) {
    return existing;
  }

  const entryId = createHistoryEntryId();
  window.history.replaceState(
    { ...state, [HISTORY_ENTRY_KEY]: entryId },
    "",
    window.location.href,
  );
  return entryId;
}

function takeReturnSnapshot(entryId: string) {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(RESTORATION_STORAGE_KEY);
    window.sessionStorage.removeItem(RESTORATION_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const snapshot = JSON.parse(raw) as Partial<CultivarSearchReturnSnapshot>;
    if (
      snapshot.version !== 2 ||
      snapshot.entryId !== entryId ||
      snapshot.url !== getCurrentUrl() ||
      typeof snapshot.savedAt !== "number" ||
      Date.now() - snapshot.savedAt > RESTORATION_MAX_AGE_MS ||
      !Array.isArray(snapshot.results)
    ) {
      return null;
    }

    return snapshot as CultivarSearchReturnSnapshot;
  } catch {
    return null;
  }
}

function getScrollAnchor() {
  const cards = document.querySelectorAll<HTMLElement>(
    "[data-cultivar-result-id]",
  );
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
    const cultivarReferenceId = card.dataset.cultivarResultId;
    if (!cultivarReferenceId) continue;
    return { cultivarReferenceId, viewportOffset: rect.top };
  }
  return null;
}

function getInitialFilters(
  initialState: InitialCultivarSearchState,
): CultivarSearchFilters {
  return {
    bloomHabit: initialState.bloomHabit ?? "",
    bloomSizeMax: initialState.bloomSizeMax ?? "",
    bloomSizeMin: initialState.bloomSizeMin ?? "",
    bloomSeason: initialState.bloomSeason ?? "",
    branchesMax: initialState.branchesMax ?? "",
    branchesMin: initialState.branchesMin ?? "",
    budCountMax: initialState.budCountMax ?? "",
    budCountMin: initialState.budCountMin ?? "",
    color: initialState.color ?? "",
    cultivarName: initialState.cultivarName ?? "",
    foliageType: initialState.foliageType ?? "",
    form: initialState.form ?? "",
    fragrance: initialState.fragrance ?? "",
    hasCultivarPhoto: initialState.hasCultivarPhoto,
    hasForSaleListings: initialState.hasForSaleListings,
    hasListings: initialState.hasListings,
    hybridizer: initialState.hybridizer ?? "",
    parentage: initialState.parentage ?? "",
    ploidy: initialState.ploidy ?? "",
    scapeHeightMax: initialState.scapeHeightMax ?? "",
    scapeHeightMin: initialState.scapeHeightMin ?? "",
    yearMax: initialState.yearMax ?? "",
    yearMin: initialState.yearMin ?? "",
  };
}

function readControlStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const urlState: InitialCultivarSearchState = {
    advanced:
      params.get("advanced") === "true" ||
      hasAdvancedCultivarSearchState((key) => params.has(key)),
    bloomHabit: params.get("bloomHabit") ?? undefined,
    bloomSizeMax: params.get("bloomSizeMax") ?? undefined,
    bloomSizeMin: params.get("bloomSizeMin") ?? undefined,
    bloomSeason: params.get("bloomSeason") ?? undefined,
    branchesMax: params.get("branchesMax") ?? undefined,
    branchesMin: params.get("branchesMin") ?? undefined,
    budCountMax: params.get("budCountMax") ?? undefined,
    budCountMin: params.get("budCountMin") ?? undefined,
    color: params.get("color") ?? undefined,
    cultivarName: params.get("cultivarName") ?? undefined,
    foliageType: params.get("foliageType") ?? undefined,
    form: params.get("form") ?? undefined,
    fragrance: params.get("fragrance") ?? undefined,
    hasCultivarPhoto: params.get("hasCultivarPhoto") === "true",
    hasForSaleListings: params.get("hasForSaleListings") === "true",
    hasListings: params.get("hasListings") === "true",
    hybridizer: params.get("hybridizer") ?? undefined,
    parentage: params.get("parentage") ?? undefined,
    photosFirst: params.get("photosFirst") !== "false",
    ploidy: params.get("ploidy") ?? undefined,
    q: params.get("q") ?? "",
    scapeHeightMax: params.get("scapeHeightMax") ?? undefined,
    scapeHeightMin: params.get("scapeHeightMin") ?? undefined,
    sort: params.get("sort") ?? undefined,
    yearMax: params.get("yearMax") ?? undefined,
    yearMin: params.get("yearMin") ?? undefined,
  };

  return {
    advanced: urlState.advanced ?? false,
    filters: getInitialFilters(urlState),
    photosFirst: urlState.photosFirst ?? true,
    query: urlState.q,
    sort: isCultivarSort(urlState.sort) ? urlState.sort : "relevance",
  };
}

function addParam(
  params: URLSearchParams,
  key: string,
  value: boolean | string | undefined,
) {
  if (typeof value === "boolean") {
    if (value) params.set(key, "true");
    return;
  }
  if (value?.trim()) params.set(key, value.trim());
}

function addFacetParam(params: URLSearchParams, key: string, value: string) {
  const canonicalValue = [
    ...new Set(
      value
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
    .sort((left, right) => left.localeCompare(right))
    .join("|");

  addParam(params, key, canonicalValue);
}

function getSharedFilter(id: string): PublicCatalogSearchFilterDefinition {
  const definition = getPublicCatalogSearchFilterDefinition(id);
  if (!definition) throw new Error(`Unknown shared search filter: ${id}`);
  return definition;
}

function toFacetOptions(values: string[]): PublicCatalogSearchFacetOption[] {
  return values.map((value) => ({ count: 0, label: value, value }));
}

function toNumericValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function CultivarTextFilter({
  definitionId,
  onChange,
  value,
}: {
  definitionId: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const definition = getSharedFilter(definitionId);
  return (
    <PublicCatalogSearchTextFilter
      label={definition.label}
      onChange={onChange}
      placeholder={
        definition.placeholder ?? `Search ${definition.label.toLowerCase()}`
      }
      testId={definition.testId}
      tone="dark"
      value={value}
    />
  );
}

function CultivarRangeFilter({
  bounds,
  definitionId,
  max,
  min,
  onChange,
  onCommit,
}: {
  bounds: PublicCatalogSearchRangeBounds;
  definitionId: string;
  max: string;
  min: string;
  onChange: (range: { max: string; min: string }) => void;
  onCommit: (range: { max: string; min: string }) => void;
}) {
  const definition = getSharedFilter(definitionId);
  const value: NumericRange = {
    min: toNumericValue(min),
    max: toNumericValue(max),
  };

  return (
    <PublicCatalogSearchRangeFilter
      bounds={bounds}
      label={definition.label}
      onChange={(range) =>
        onChange({
          min: range.min === null ? "" : String(range.min),
          max: range.max === null ? "" : String(range.max),
        })
      }
      onCommit={(range) =>
        onCommit({
          min: range.min === null ? "" : String(range.min),
          max: range.max === null ? "" : String(range.max),
        })
      }
      testId={definition.testId}
      tone="dark"
      unit={definition.unit}
      value={value}
    />
  );
}

function CultivarFacetFilter({
  definitionId,
  onChange,
  options,
  value,
}: {
  definitionId: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  const definition = getSharedFilter(definitionId);
  return (
    <PublicCatalogSearchFacetFilter
      label={definition.label}
      onChange={(values) => onChange(values.join("|"))}
      options={toFacetOptions(options)}
      testId={definition.testId}
      tone="dark"
      values={value ? value.split("|").filter(Boolean) : []}
    />
  );
}

function CultivarBooleanFilter({
  active,
  definitionId,
  label,
  onToggle,
  testId,
}: {
  active: boolean;
  definitionId: string;
  label?: string;
  onToggle: () => void;
  testId?: string;
}) {
  const definition = getSharedFilter(definitionId);
  return (
    <PublicCatalogSearchBooleanFilter
      active={active}
      icon={definition.icon}
      label={label ?? definition.label}
      onToggle={onToggle}
      testId={testId ?? definition.testId}
      tone="dark"
    />
  );
}

function ResponsiveAdvancedFilterSection({
  activeCount,
  children,
  initiallyOpen = false,
  title,
}: {
  activeCount: number;
  children: ReactNode;
  initiallyOpen?: boolean;
  title: string;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const isMobile = useIsMobile();

  return (
    <details
      open={!isMobile || open}
      onToggle={(event) => {
        if (isMobile) setOpen(event.currentTarget.open);
      }}
      className="group border-b border-white/20 md:border-0"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold text-white marker:content-none md:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {title}
          {activeCount > 0 ? (
            <span className="rounded-full bg-[#f4c477] px-1.5 py-0.5 text-[10px] leading-none font-bold text-[#142118]">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronDown className="size-4 text-white/60 transition-transform group-open:rotate-180" />
      </summary>
      <PublicCatalogSearchSection
        title={title}
        className="pt-1 pb-4 md:block md:py-0 [&>div:first-child]:hidden md:[&>div:first-child]:flex"
      >
        {children}
      </PublicCatalogSearchSection>
    </details>
  );
}

function AdvancedFilters({
  filters,
  onChange,
  onCommit,
}: {
  filters: CultivarSearchFilters;
  onChange: (patch: Partial<CultivarSearchFilters>) => void;
  onCommit: (patch: Partial<CultivarSearchFilters>) => void;
}) {
  const updateImmediately = (patch: Partial<CultivarSearchFilters>) => {
    onChange(patch);
    onCommit(patch);
  };

  return (
    <div className="grid gap-x-6 border-t border-white/20 md:grid-cols-2 md:gap-y-6 md:pt-4 xl:grid-cols-3">
      <ResponsiveAdvancedFilterSection
        title="Registration"
        initiallyOpen
        activeCount={
          [
            filters.cultivarName,
            filters.hybridizer,
            filters.yearMin || filters.yearMax,
          ].filter(Boolean).length
        }
      >
        <div className="space-y-3">
          <CultivarTextFilter
            definitionId="cultivarName"
            value={filters.cultivarName}
            onChange={(cultivarName) => onChange({ cultivarName })}
          />
          <CultivarTextFilter
            definitionId="hybridizer"
            value={filters.hybridizer}
            onChange={(hybridizer) => onChange({ hybridizer })}
          />
          <CultivarRangeFilter
            definitionId="year"
            bounds={{ min: 1890, max: new Date().getFullYear(), step: 1 }}
            min={filters.yearMin}
            max={filters.yearMax}
            onChange={({ min: yearMin, max: yearMax }) =>
              onChange({ yearMin, yearMax })
            }
            onCommit={({ min: yearMin, max: yearMax }) =>
              onCommit({ yearMin, yearMax })
            }
          />
        </div>
      </ResponsiveAdvancedFilterSection>

      <ResponsiveAdvancedFilterSection
        title="Bloom Traits"
        activeCount={
          [
            filters.bloomHabit,
            filters.bloomSeason,
            filters.scapeHeightMin || filters.scapeHeightMax,
            filters.bloomSizeMin || filters.bloomSizeMax,
            filters.budCountMin || filters.budCountMax,
            filters.branchesMin || filters.branchesMax,
          ].filter(Boolean).length
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <CultivarFacetFilter
              definitionId="bloomHabit"
              value={filters.bloomHabit}
              options={["Diurnal", "Nocturnal", "Extended", "Rebloom"]}
              onChange={(bloomHabit) => updateImmediately({ bloomHabit })}
            />
            <CultivarFacetFilter
              definitionId="bloomSeason"
              value={filters.bloomSeason}
              options={[
                "Extra Early",
                "Early",
                "Early-Midseason",
                "Midseason",
                "Late-Midseason",
                "Late",
                "Very Late",
              ]}
              onChange={(bloomSeason) => updateImmediately({ bloomSeason })}
            />
          </div>
          <CultivarRangeFilter
            definitionId="scapeHeight"
            bounds={{ min: 1, max: 100, step: 1 }}
            min={filters.scapeHeightMin}
            max={filters.scapeHeightMax}
            onChange={({ min: scapeHeightMin, max: scapeHeightMax }) =>
              onChange({ scapeHeightMin, scapeHeightMax })
            }
            onCommit={({ min: scapeHeightMin, max: scapeHeightMax }) =>
              onCommit({ scapeHeightMin, scapeHeightMax })
            }
          />
          <CultivarRangeFilter
            definitionId="bloomSize"
            bounds={{ min: 1, max: 15, step: 1 }}
            min={filters.bloomSizeMin}
            max={filters.bloomSizeMax}
            onChange={({ min: bloomSizeMin, max: bloomSizeMax }) =>
              onChange({ bloomSizeMin, bloomSizeMax })
            }
            onCommit={({ min: bloomSizeMin, max: bloomSizeMax }) =>
              onCommit({ bloomSizeMin, bloomSizeMax })
            }
          />
          <CultivarRangeFilter
            definitionId="budcount"
            bounds={{ min: 0, max: 100, step: 1 }}
            min={filters.budCountMin}
            max={filters.budCountMax}
            onChange={({ min: budCountMin, max: budCountMax }) =>
              onChange({ budCountMin, budCountMax })
            }
            onCommit={({ min: budCountMin, max: budCountMax }) =>
              onCommit({ budCountMin, budCountMax })
            }
          />
          <CultivarRangeFilter
            definitionId="branches"
            bounds={{ min: 0, max: 20, step: 1 }}
            min={filters.branchesMin}
            max={filters.branchesMax}
            onChange={({ min: branchesMin, max: branchesMax }) =>
              onChange({ branchesMin, branchesMax })
            }
            onCommit={({ min: branchesMin, max: branchesMax }) =>
              onCommit({ branchesMin, branchesMax })
            }
          />
        </div>
      </ResponsiveAdvancedFilterSection>

      <ResponsiveAdvancedFilterSection
        title="Classification & Details"
        activeCount={
          [
            filters.form,
            filters.ploidy,
            filters.foliageType,
            filters.fragrance,
            filters.color,
            filters.parentage,
          ].filter(Boolean).length
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <CultivarFacetFilter
              definitionId="form"
              value={filters.form}
              options={[
                "Single",
                "Double",
                "Spider",
                "Unusual",
                "Polymerous",
                "Sculpted",
                "Crispate",
                "Cascade",
              ]}
              onChange={(form) => updateImmediately({ form })}
            />
            <CultivarFacetFilter
              definitionId="ploidy"
              value={filters.ploidy}
              options={["Diploid", "Tetraploid"]}
              onChange={(ploidy) => updateImmediately({ ploidy })}
            />
            <CultivarFacetFilter
              definitionId="foliageType"
              value={filters.foliageType}
              options={["Dormant", "Semi-Evergreen", "Evergreen"]}
              onChange={(foliageType) => updateImmediately({ foliageType })}
            />
            <CultivarFacetFilter
              definitionId="fragrance"
              value={filters.fragrance}
              options={["Fragrant", "Very Fragrant"]}
              onChange={(fragrance) => updateImmediately({ fragrance })}
            />
          </div>
          <CultivarTextFilter
            definitionId="color"
            value={filters.color}
            onChange={(color) => onChange({ color })}
          />
          <CultivarTextFilter
            definitionId="parentage"
            value={filters.parentage}
            onChange={(parentage) => onChange({ parentage })}
          />
        </div>
      </ResponsiveAdvancedFilterSection>
    </div>
  );
}

function CultivarCard({
  index,
  onOpen,
  result,
}: {
  index: number;
  onOpen: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  result: CultivarSearchResult;
}) {
  const canonicalPath = result.canonicalUrl
    ? new URL(result.canonicalUrl).pathname
    : null;
  const attribution = [result.traits.hybridizer, result.traits.year]
    .filter(Boolean)
    .join(", ");

  const content = (
    <article className="group relative isolate flex min-h-[19rem] overflow-hidden rounded-3xl border border-[#dbe3d5] bg-[#173126] text-white shadow-[0_24px_80px_-58px_rgba(24,50,32,0.9)] transition-transform duration-300 hover:-translate-y-1">
      {result.imageUrl ? (
        <OptimizedImage
          alt={`${result.name} daylily`}
          className="absolute inset-0 aspect-auto size-full rounded-none transition-transform duration-500 group-hover:scale-[1.04]"
          image={
            result.imageAsset
              ? {
                  id: result.imageAsset.id,
                  url: result.imageUrl,
                  imageAsset: result.imageAsset,
                }
              : undefined
          }
          src={result.imageAsset ? undefined : result.imageUrl}
          size="full"
          priority={index < 3}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#6b8f63,#173126_62%)]" />
      )}

      <div className="relative z-10 flex min-h-[19rem] w-full flex-col justify-end p-5">
        <div className="max-w-full">
          <h2 className="text-2xl leading-tight font-semibold text-white [text-shadow:0_2px_3px_rgba(0,0,0,0.98),0_0_10px_rgba(0,0,0,0.95),0_0_24px_rgba(0,0,0,0.8)]">
            {result.name}
          </h2>
          {attribution ? (
            <p className="mt-1 text-sm font-semibold text-[#f4c477] [text-shadow:0_1px_2px_rgba(0,0,0,1),0_0_8px_rgba(0,0,0,0.95),0_0_18px_rgba(0,0,0,0.8)]">
              {attribution}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (!canonicalPath) return content;

  return (
    <Link
      data-cultivar-result-id={result.cultivarReferenceId}
      href={canonicalPath}
      onClick={(event) => {
        onOpen(event);
        capturePosthogEvent("public_cultivar_search_result_opened", {
          cultivar_reference_id: result.cultivarReferenceId,
          result_index: index,
          matched_on: result.matchedOn,
          source_path: "/cultivars",
        });
      }}
      className="block rounded-3xl focus-visible:ring-2 focus-visible:ring-[#b7791f] focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="min-h-[19rem] animate-pulse rounded-3xl bg-[#dfe5d9]"
        />
      ))}
    </div>
  );
}

export function CultivarSearchPageClient({
  initialState,
}: {
  initialState: InitialCultivarSearchState;
}) {
  const [query, setQuery] = useState(initialState.q);
  const [debouncedQuery, setDebouncedQuery] = useState(initialState.q);
  const [filters, setFilters] = useState(() => getInitialFilters(initialState));
  const [requestFilters, setRequestFilters] = useState(() =>
    getInitialFilters(initialState),
  );
  const [sort, setSort] = useState<CultivarSort>(() =>
    isCultivarSort(initialState.sort) ? initialState.sort : "relevance",
  );
  const [photosFirst, setPhotosFirst] = useState(
    initialState.photosFirst ?? true,
  );
  const [advanced, setAdvanced] = useState(initialState.advanced ?? false);
  const [results, setResults] = useState<CultivarSearchResult[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [restorationChecked, setRestorationChecked] = useState(false);
  const requestCounter = useRef(0);
  const historyEntryIdRef = useRef<string | null>(null);
  const pendingScrollRestorationRef =
    useRef<CultivarSearchReturnSnapshot | null>(null);
  const skipNextFetchRef = useRef(false);
  const hasPresentedSearchStateRef = useRef(false);
  const retryPendingRef = useRef(false);

  useEffect(() => {
    const urlState = readControlStateFromUrl();
    setQuery(urlState.query);
    setDebouncedQuery(urlState.query);
    setFilters(urlState.filters);
    setRequestFilters(urlState.filters);
    setSort(urlState.sort);
    setPhotosFirst(urlState.photosFirst);
    setAdvanced(urlState.advanced);

    const entryId = ensureHistoryEntryId();
    historyEntryIdRef.current = entryId;
    const snapshot = takeReturnSnapshot(entryId);
    if (snapshot) {
      setResults(snapshot.results);
      setNextOffset(snapshot.nextOffset);
      setLoading(false);
      pendingScrollRestorationRef.current = snapshot;
      skipNextFetchRef.current = true;
      hasPresentedSearchStateRef.current = true;
    }
    setRestorationChecked(true);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setRequestFilters((current) => ({
        ...current,
        color: filters.color,
        cultivarName: filters.cultivarName,
        hybridizer: filters.hybridizer,
        parentage: filters.parentage,
      }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    filters.color,
    filters.cultivarName,
    filters.hybridizer,
    filters.parentage,
  ]);

  const shareParams = useMemo(() => {
    const params = new URLSearchParams();
    addParam(params, "q", debouncedQuery);
    addFacetParam(params, "bloomHabit", requestFilters.bloomHabit);
    addParam(params, "bloomSizeMax", requestFilters.bloomSizeMax);
    addParam(params, "bloomSizeMin", requestFilters.bloomSizeMin);
    addFacetParam(params, "bloomSeason", requestFilters.bloomSeason);
    addParam(params, "branchesMax", requestFilters.branchesMax);
    addParam(params, "branchesMin", requestFilters.branchesMin);
    addParam(params, "budCountMax", requestFilters.budCountMax);
    addParam(params, "budCountMin", requestFilters.budCountMin);
    addParam(params, "color", requestFilters.color);
    addParam(params, "cultivarName", requestFilters.cultivarName);
    addFacetParam(params, "foliageType", requestFilters.foliageType);
    addFacetParam(params, "form", requestFilters.form);
    addFacetParam(params, "fragrance", requestFilters.fragrance);
    addParam(params, "hasCultivarPhoto", requestFilters.hasCultivarPhoto);
    addParam(params, "hasForSaleListings", requestFilters.hasForSaleListings);
    addParam(params, "hasListings", requestFilters.hasListings);
    addParam(params, "hybridizer", requestFilters.hybridizer);
    addParam(params, "parentage", requestFilters.parentage);
    addFacetParam(params, "ploidy", requestFilters.ploidy);
    addParam(params, "scapeHeightMax", requestFilters.scapeHeightMax);
    addParam(params, "scapeHeightMin", requestFilters.scapeHeightMin);
    addParam(params, "yearMax", requestFilters.yearMax);
    addParam(params, "yearMin", requestFilters.yearMin);
    if (!photosFirst) params.set("photosFirst", "false");
    if (sort !== "relevance") params.set("sort", sort);
    params.sort();
    return params.toString();
  }, [debouncedQuery, photosFirst, requestFilters, sort]);

  const urlParams = useMemo(() => {
    const params = new URLSearchParams(shareParams);
    if (advanced) params.set("advanced", "true");
    params.sort();
    return params.toString();
  }, [advanced, shareParams]);

  const buildRequestParams = useCallback(
    (offset: number) => {
      const params = new URLSearchParams(shareParams);
      params.set("mode", "summary");
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      params.set("photosFirst", String(photosFirst));
      params.set("sort", sort);
      params.sort();
      return params;
    },
    [photosFirst, shareParams, sort],
  );

  useEffect(() => {
    if (!restorationChecked) return;
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const controller = new AbortController();
    const clientRequestSequence = ++requestCounter.current;
    const requestKind: SearchRequestKind = retryPendingRef.current
      ? "retry"
      : hasPresentedSearchStateRef.current
        ? "refinement"
        : "initial";
    retryPendingRef.current = false;
    const requestParams = buildRequestParams(0);
    const requestStartedAt = performance.now();
    let responseTelemetry: SearchResponseTelemetry = {
      httpStatus: 0,
      requestId: undefined,
      serverDurationMs: undefined,
    };
    setLoading(true);
    setError(null);

    void fetch(`/api/v1/cultivars/search?${requestParams}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        responseTelemetry = getSearchResponseTelemetry(response);
        if (!response.ok) {
          throw new Error(
            response.status === 503
              ? "The cultivar index is refreshing. Try again in a moment."
              : "Cultivar search could not be loaded.",
          );
        }
        return (await response.json()) as CultivarSearchResponse;
      })
      .then((data) => {
        if (clientRequestSequence !== requestCounter.current) return;
        hasPresentedSearchStateRef.current = true;
        setResults(data.results);
        setNextOffset(data.pagination.nextOffset);
        captureSearchResultsViewed({
          clientDurationMs: performance.now() - requestStartedAt,
          hasMore: data.pagination.hasMore,
          outcome: data.results.length > 0 ? "results" : "empty",
          params: requestParams,
          requestKind,
          responseTelemetry,
          resultsReturned: data.results.length,
          visibleResultCount: data.results.length,
        });
      })
      .catch((caughtError: unknown) => {
        if (
          controller.signal.aborted ||
          clientRequestSequence !== requestCounter.current
        ) {
          return;
        }
        hasPresentedSearchStateRef.current = true;
        setResults([]);
        setNextOffset(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Cultivar search could not be loaded.",
        );
        captureSearchResultsViewed({
          clientDurationMs: performance.now() - requestStartedAt,
          outcome:
            responseTelemetry.httpStatus === 503
              ? "index_unavailable"
              : "error",
          params: requestParams,
          requestKind,
          responseTelemetry,
          resultsReturned: 0,
          visibleResultCount: 0,
        });
      })
      .finally(() => {
        if (clientRequestSequence === requestCounter.current) setLoading(false);
      });

    return () => controller.abort();
  }, [buildRequestParams, restorationChecked, retryKey, shareParams]);

  useEffect(() => {
    if (!restorationChecked) return;
    const nextUrl = urlParams ? `/cultivars?${urlParams}` : "/cultivars";
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [restorationChecked, urlParams]);

  useEffect(() => {
    const snapshot = pendingScrollRestorationRef.current;
    if (!snapshot || loading) return;
    pendingScrollRestorationRef.current = null;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const anchor = snapshot.scrollAnchor
          ? Array.from(
              document.querySelectorAll<HTMLElement>(
                "[data-cultivar-result-id]",
              ),
            ).find(
              (card) =>
                card.dataset.cultivarResultId ===
                snapshot.scrollAnchor?.cultivarReferenceId,
            )
          : null;
        if (anchor && snapshot.scrollAnchor) {
          window.scrollBy({
            behavior: "instant",
            top:
              anchor.getBoundingClientRect().top -
              snapshot.scrollAnchor.viewportOffset,
          });
          return;
        }
        window.scrollTo({ behavior: "instant", top: snapshot.scrollY });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [loading, results.length]);

  const updateFilters = (patch: Partial<CultivarSearchFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const commitFilters = (patch: Partial<CultivarSearchFilters>) => {
    setRequestFilters((current) => ({ ...current, ...patch }));
  };

  const updateFiltersImmediately = (patch: Partial<CultivarSearchFilters>) => {
    updateFilters(patch);
    commitFilters(patch);
  };

  const clearFilterKeys = (...keys: Array<keyof CultivarSearchFilters>) => {
    const patch = Object.fromEntries(
      keys.map((key) => [key, EMPTY_FILTERS[key]]),
    ) as Partial<CultivarSearchFilters>;
    updateFiltersImmediately(patch);
  };

  const activeFilterChips: PublicCatalogSearchFilterChip[] = [];
  if (debouncedQuery) {
    activeFilterChips.push({
      id: "query",
      label: `Search: ${debouncedQuery}`,
      onClear: () => {
        setQuery("");
        setDebouncedQuery("");
      },
    });
  }

  for (const { key, label } of BOOLEAN_FILTER_CHIPS) {
    if (!requestFilters[key]) continue;
    activeFilterChips.push({
      id: key,
      label,
      onClear: () => clearFilterKeys(key),
    });
  }

  for (const { key, label } of TEXT_FILTER_CHIPS) {
    const value = requestFilters[key];
    if (typeof value !== "string" || !value.trim()) continue;
    activeFilterChips.push({
      id: key,
      label: `${label}: ${value.trim()}`,
      onClear: () => clearFilterKeys(key),
    });
  }

  for (const { key, label } of FACET_FILTER_CHIPS) {
    const value = requestFilters[key];
    if (typeof value !== "string" || !value.trim()) continue;
    activeFilterChips.push({
      id: key,
      label: `${label}: ${formatFacetChipValue(value)}`,
      onClear: () => clearFilterKeys(key),
    });
  }

  for (const { label, maxKey, minKey, prefix, suffix } of RANGE_FILTER_CHIPS) {
    const min = requestFilters[minKey];
    const max = requestFilters[maxKey];
    if (typeof min !== "string" || typeof max !== "string" || (!min && !max)) {
      continue;
    }
    activeFilterChips.push({
      id: `${minKey}-${maxKey}`,
      label: formatRangeChipLabel({ label, max, min, prefix, suffix }),
      onClear: () => clearFilterKeys(minKey, maxKey),
    });
  }

  const clearAll = () => {
    setQuery("");
    setDebouncedQuery("");
    setFilters(EMPTY_FILTERS);
    setRequestFilters(EMPTY_FILTERS);
    setSort("relevance");
    setPhotosFirst(true);
    setAdvanced(false);
  };

  const hasSearchState = Boolean(
    debouncedQuery ||
      Object.values(filters).some(Boolean) ||
      sort !== "relevance" ||
      !photosFirst ||
      advanced,
  );

  const saveReturnSnapshot = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const entryId = historyEntryIdRef.current ?? ensureHistoryEntryId();
      historyEntryIdRef.current = entryId;
      const snapshot: CultivarSearchReturnSnapshot = {
        entryId,
        nextOffset,
        results,
        savedAt: Date.now(),
        scrollAnchor: getScrollAnchor(),
        scrollY: window.scrollY,
        url: getCurrentUrl(),
        version: 2,
      };

      try {
        window.sessionStorage.setItem(
          RESTORATION_STORAGE_KEY,
          JSON.stringify(snapshot),
        );
      } catch {
        // Browser storage can be disabled; URL state still restores normally.
      }
    },
    [nextOffset, results],
  );

  const loadMore = async () => {
    if (nextOffset === null || loadingMore) return;
    const clientRequestSequence = requestCounter.current;
    const requestParams = buildRequestParams(nextOffset);
    const requestStartedAt = performance.now();
    let responseTelemetry: SearchResponseTelemetry = {
      httpStatus: 0,
      requestId: undefined,
      serverDurationMs: undefined,
    };
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/cultivars/search?${requestParams}`);
      responseTelemetry = getSearchResponseTelemetry(response);
      if (!response.ok) throw new Error("More cultivars could not be loaded.");
      const data = (await response.json()) as CultivarSearchResponse;
      if (clientRequestSequence !== requestCounter.current) return;
      setResults((current) => [...current, ...data.results]);
      setNextOffset(data.pagination.nextOffset);
      captureSearchResultsViewed({
        clientDurationMs: performance.now() - requestStartedAt,
        hasMore: data.pagination.hasMore,
        outcome: data.results.length > 0 ? "results" : "empty",
        params: requestParams,
        requestKind: "load_more",
        responseTelemetry,
        resultsReturned: data.results.length,
        visibleResultCount: results.length + data.results.length,
      });
    } catch (caughtError) {
      if (clientRequestSequence !== requestCounter.current) return;
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "More cultivars could not be loaded.",
      );
      captureSearchResultsViewed({
        clientDurationMs: performance.now() - requestStartedAt,
        outcome:
          responseTelemetry.httpStatus === 503 ? "index_unavailable" : "error",
        params: requestParams,
        requestKind: "load_more",
        responseTelemetry,
        resultsReturned: 0,
        visibleResultCount: results.length,
      });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="bg-white">
      <section className="relative isolate overflow-clip px-4 pt-28 text-white lg:px-8 lg:pt-28">
        <div className="absolute inset-0 -z-10 bg-[#07120e]" aria-hidden="true">
          <Image
            src="/assets/home-redesign/daylily-hero-grid.webp"
            alt=""
            fill
            priority
            sizes="140vw"
            className="hero-grid-pan size-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,18,14,0.92)_0%,rgba(7,18,14,0.72)_38%,rgba(7,18,14,0.2)_72%,transparent_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_36%),radial-gradient(circle_at_100%_100%,rgba(7,18,14,0.92)_0%,rgba(7,18,14,0.62)_42%,rgba(7,18,14,0.12)_72%,rgba(7,18,14,0)_100%)]" />
        </div>

        <div className="mx-auto max-w-[1180px]">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-white sm:text-5xl">
            Search over 100,000 daylily cultivars
          </h1>
          <p className="mt-2 max-w-2xl text-base text-[#dfe9dc]">
            Find cultivars by name, hybridizer, color, bloom season, and more.
          </p>

          <div className="mt-7 space-y-2 border-y border-white/28 bg-[#07120e]/35 py-3 backdrop-blur-[2px]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Search</div>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-xs text-white/70">
                <span role="status" aria-live="polite">
                  {loading
                    ? "Searching…"
                    : `${results.length.toLocaleString()} shown${nextOffset !== null ? " · more available" : ""}`}
                </span>
                {hasSearchState ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-7 gap-1 px-2 text-white hover:bg-white/10 hover:text-white"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </Button>
                ) : null}
              </div>
            </div>

            <PublicCatalogSearchFilterChipList
              chips={activeFilterChips}
              className="pt-1"
              buttonClassName="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            />

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 max-sm:gap-y-1.5">
              <div className="space-y-1.5 max-sm:contents">
                <div className="text-xs font-medium tracking-wide text-[#f4c477] uppercase">
                  Cultivar search
                </div>
                <PublicCatalogSearchQueryInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by cultivar name, hybridizer, or color…"
                  className="max-sm:col-span-2"
                  inputClassName="h-10 border-white/30 bg-white/95 text-[#142118] shadow-none placeholder:text-[#617064] focus-visible:ring-[#f4c477]"
                />
              </div>

              <div className="text-white max-sm:col-start-2 max-sm:row-start-1 [&_[data-testid=search-mode-toggle]>span]:text-[#f4c477]">
                <PublicCatalogSearchModeToggle
                  id="cultivar-search-mode-switch"
                  checked={advanced}
                  onCheckedChange={setAdvanced}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center [&>button]:w-full sm:[&>button]:w-auto">
              <CultivarBooleanFilter
                active={filters.hasCultivarPhoto}
                definitionId="hasPhoto"
                label="With photos"
                testId="cultivar-filter-has-photo"
                onToggle={() =>
                  updateFiltersImmediately({
                    hasCultivarPhoto: !filters.hasCultivarPhoto,
                  })
                }
              />
              <CultivarBooleanFilter
                active={filters.hasListings}
                definitionId="linkedToCultivar"
                label="In catalogs"
                onToggle={() =>
                  updateFiltersImmediately({
                    hasListings: !filters.hasListings,
                  })
                }
              />
              <CultivarBooleanFilter
                active={filters.hasForSaleListings}
                definitionId="price"
                label="For sale"
                onToggle={() =>
                  updateFiltersImmediately({
                    hasForSaleListings: !filters.hasForSaleListings,
                  })
                }
              />
            </div>

            {advanced ? (
              <AdvancedFilters
                filters={filters}
                onChange={updateFilters}
                onCommit={commitFilters}
              />
            ) : null}
          </div>
        </div>

        <style jsx global>{`
          @keyframes hero-grid-pan {
            0%,
            100% {
              transform: scale(1.38) translate3d(8%, 0, 0);
            }
            50% {
              transform: scale(1.38) translate3d(-8%, 0, 0);
            }
          }

          .hero-grid-pan {
            animation: hero-grid-pan 82s ease-in-out infinite;
            animation-delay: -18s;
            transform-origin: center;
            will-change: transform;
          }

          @media (prefers-reduced-motion: reduce) {
            .hero-grid-pan {
              animation: none;
              transform: scale(1.38);
            }
          }

          @media (max-width: 1023px) {
            @keyframes hero-grid-pan {
              0%,
              100% {
                transform: scale(1.95) translate3d(8%, 0, 0);
              }
              50% {
                transform: scale(1.95) translate3d(-8%, 0, 0);
              }
            }
          }
        `}</style>
      </section>

      <section
        aria-labelledby="cultivar-results-heading"
        className="mx-auto max-w-[1180px] px-4 py-8 lg:px-8 lg:py-10"
      >
        <div className="mb-5 border-b border-[#142118]/14 pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="cultivar-results-heading"
                className="text-2xl font-semibold text-[#142118]"
              >
                {debouncedQuery ? "Search results" : "Browse cultivars"}
              </h2>
              <p className="mt-1 text-sm text-[#617064]">
                Open a cultivar to see its details, photos, parentage, and
                public listings.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[#142118]/10 pt-4">
            <div
              aria-label="Sort cultivars"
              className="flex flex-wrap items-center gap-2"
              role="group"
            >
              <span className="mr-1 text-xs font-semibold tracking-[0.12em] text-[#617064] uppercase">
                Sort
              </span>
              {SORT_OPTIONS.map((option) => {
                const active = sort === option.value;
                return (
                  <Button
                    aria-pressed={active}
                    className={
                      active
                        ? "h-9 border-[#173126] bg-[#173126] px-3.5 text-white shadow-none hover:bg-[#294635]"
                        : "h-9 border-[#142118]/20 bg-white px-3.5 text-[#294635] shadow-none hover:border-[#142118]/35 hover:bg-[#f2f5ef]"
                    }
                    key={option.value}
                    onClick={() => setSort(option.value)}
                    size="sm"
                    type="button"
                    variant={active ? "default" : "outline"}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>

            <div className="border-[#142118]/12 sm:border-l sm:pl-5">
              <Button
                aria-pressed={photosFirst}
                className={
                  photosFirst
                    ? "h-9 border-[#173126] bg-[#173126] px-3.5 text-white shadow-none hover:bg-[#294635]"
                    : "h-9 border-[#142118]/20 bg-white px-3.5 text-[#294635] shadow-none hover:border-[#142118]/35 hover:bg-[#f2f5ef]"
                }
                data-testid="cultivar-sort-photos-first"
                onClick={() => setPhotosFirst((current) => !current)}
                size="sm"
                type="button"
                variant={photosFirst ? "default" : "outline"}
              >
                <Camera className="size-4" />
                Photos first
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <ResultsSkeleton />
        ) : error && results.length === 0 ? (
          <div className="border-y border-[#142118]/15 py-14 text-center">
            <h3 className="text-xl font-semibold">
              The index needs another moment
            </h3>
            <p className="mt-2 text-sm text-[#617064]">{error}</p>
            <Button
              className="mt-5 bg-[#142118] text-white hover:bg-[#294635]"
              onClick={() => {
                retryPendingRef.current = true;
                setRetryKey((value) => value + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : results.length === 0 ? (
          <div className="border-y border-[#142118]/15 py-14 text-center">
            <h3 className="text-xl font-semibold">No cultivars found</h3>
            <p className="mt-2 text-sm text-[#617064]">
              Try a shorter name or remove one of the filters.
            </p>
            <Button variant="outline" className="mt-5" onClick={clearAll}>
              Clear search and filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {results.map((result, index) => (
                <CultivarCard
                  key={result.cultivarReferenceId}
                  index={index}
                  onOpen={saveReturnSnapshot}
                  result={result}
                />
              ))}
            </div>

            {error ? (
              <p className="mt-5 border-y border-[#b7791f]/25 py-3 text-sm text-[#765721]">
                {error}
              </p>
            ) : null}

            {nextOffset !== null ? (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="h-11 min-w-48 border-[#142118]/25 bg-white shadow-none"
                >
                  {loadingMore ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      Load more cultivars
                      <ChevronDown className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
