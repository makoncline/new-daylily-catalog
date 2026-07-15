"use client";

// eslint-disable react/no-unknown-property -- Next styled-jsx uses jsx/global attributes.

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LoaderCircle, RotateCcw } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capturePosthogEvent } from "@/lib/analytics/posthog";
import { useIsMobile } from "@/hooks/use-mobile";

const PAGE_SIZE = 24;

type CultivarSort = "relevance" | "name" | "newest" | "oldest" | "mostListed";

interface InitialCultivarSearchState {
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
  hasListingPhoto?: boolean;
  hasListings: boolean;
  hybridizer?: string;
  listingDescription?: string;
  listingTitle?: string;
  parentage?: string;
  ploidy?: string;
  priceMax?: string;
  priceMin?: string;
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
  hasListingPhoto: boolean;
  hasListings: boolean;
  hybridizer: string;
  listingDescription: string;
  listingTitle: string;
  parentage: string;
  ploidy: string;
  priceMax: string;
  priceMin: string;
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
  hasListingPhoto: false,
  hasListings: false,
  hybridizer: "",
  listingDescription: "",
  listingTitle: "",
  parentage: "",
  ploidy: "",
  priceMax: "",
  priceMin: "",
  scapeHeightMax: "",
  scapeHeightMin: "",
  yearMax: "",
  yearMin: "",
};

const SORT_OPTIONS: Array<{ label: string; value: CultivarSort }> = [
  { label: "Recommended", value: "relevance" },
  { label: "Name A–Z", value: "name" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Most listed", value: "mostListed" },
];

function isCultivarSort(value: string | undefined): value is CultivarSort {
  return SORT_OPTIONS.some((option) => option.value === value);
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
    hasListingPhoto: initialState.hasListingPhoto ?? false,
    hasListings: initialState.hasListings,
    hybridizer: initialState.hybridizer ?? "",
    listingDescription: initialState.listingDescription ?? "",
    listingTitle: initialState.listingTitle ?? "",
    parentage: initialState.parentage ?? "",
    ploidy: initialState.ploidy ?? "",
    priceMax: initialState.priceMax ?? "",
    priceMin: initialState.priceMin ?? "",
    scapeHeightMax: initialState.scapeHeightMax ?? "",
    scapeHeightMin: initialState.scapeHeightMin ?? "",
    yearMax: initialState.yearMax ?? "",
    yearMin: initialState.yearMin ?? "",
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

function cleanTrait(value: string | null) {
  if (!value) return null;
  const cleaned = value.trim().replaceAll("|", " · ");
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : null;
}

function getResultDetails(result: CultivarSearchResult) {
  return [
    cleanTrait(result.traits.bloomSeason),
    cleanTrait(result.traits.form),
    cleanTrait(result.traits.ploidy),
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, 3)
    .join(" · ");
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
    <div className="grid gap-x-6 border-t border-white/20 md:grid-cols-2 md:gap-y-6 md:pt-4 xl:grid-cols-4">
      <ResponsiveAdvancedFilterSection
        title="Listing"
        initiallyOpen
        activeCount={
          [
            filters.listingTitle,
            filters.listingDescription,
            filters.priceMin || filters.priceMax,
            filters.hasListingPhoto,
          ].filter(Boolean).length
        }
      >
        <div className="space-y-3">
          <CultivarTextFilter
            definitionId="title"
            value={filters.listingTitle}
            onChange={(listingTitle) => onChange({ listingTitle })}
          />
          <CultivarTextFilter
            definitionId="description"
            value={filters.listingDescription}
            onChange={(listingDescription) => onChange({ listingDescription })}
          />
          <CultivarRangeFilter
            definitionId="priceValue"
            bounds={{ min: 0, max: 500, step: 1 }}
            min={filters.priceMin}
            max={filters.priceMax}
            onChange={({ min: priceMin, max: priceMax }) =>
              onChange({ priceMin, priceMax })
            }
            onCommit={({ min: priceMin, max: priceMax }) =>
              onCommit({ priceMin, priceMax })
            }
          />
          <CultivarBooleanFilter
            active={filters.hasListingPhoto}
            definitionId="hasPhoto"
            label="Listing has photo"
            onToggle={() =>
              updateImmediately({
                hasListingPhoto: !filters.hasListingPhoto,
              })
            }
          />
        </div>
      </ResponsiveAdvancedFilterSection>

      <ResponsiveAdvancedFilterSection
        title="Registration"
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
  result,
}: {
  index: number;
  result: CultivarSearchResult;
}) {
  const canonicalPath = result.canonicalUrl
    ? new URL(result.canonicalUrl).pathname
    : null;
  const detailLine = getResultDetails(result);
  const availability = result.listingSummary.catalogsWithListings;

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

      <div className="absolute inset-0 bg-linear-to-t from-[#07120e]/98 via-[#07120e]/38 to-[#07120e]/8" />

      <div className="relative z-10 flex min-h-[19rem] w-full flex-col justify-end p-5">
        <h2 className="text-2xl leading-tight font-semibold text-white drop-shadow-lg">
          {result.name}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#f4c477]">
          {[result.traits.hybridizer, result.traits.year]
            .filter(Boolean)
            .join(", ") || "Cultivar details"}
        </p>
        {detailLine ? (
          <p className="mt-2 line-clamp-1 text-sm text-white/78">
            {detailLine}
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/20 pt-3 text-sm font-bold">
          <span>
            {availability > 0
              ? `${availability} ${availability === 1 ? "catalog" : "catalogs"}`
              : "View cultivar"}
          </span>
          <span className="text-[#f4c477]">Open →</span>
        </div>
      </div>
    </article>
  );

  if (!canonicalPath) return content;

  return (
    <Link
      href={canonicalPath}
      onClick={() =>
        capturePosthogEvent("public_cultivar_search_result_opened", {
          cultivar_reference_id: result.cultivarReferenceId,
          result_index: index,
          matched_on: result.matchedOn,
          source_path: "/cultivars",
        })
      }
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
  const [advanced, setAdvanced] = useState(false);
  const [results, setResults] = useState<CultivarSearchResult[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const requestCounter = useRef(0);

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
        listingDescription: filters.listingDescription,
        listingTitle: filters.listingTitle,
        parentage: filters.parentage,
      }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    filters.color,
    filters.cultivarName,
    filters.hybridizer,
    filters.listingDescription,
    filters.listingTitle,
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
    addParam(params, "hasPhoto", requestFilters.hasListingPhoto);
    addParam(params, "hasListings", requestFilters.hasListings);
    addParam(params, "hybridizer", requestFilters.hybridizer);
    addParam(params, "listingDescription", requestFilters.listingDescription);
    addParam(params, "listingTitle", requestFilters.listingTitle);
    addParam(params, "parentage", requestFilters.parentage);
    addFacetParam(params, "ploidy", requestFilters.ploidy);
    addParam(params, "priceMax", requestFilters.priceMax);
    addParam(params, "priceMin", requestFilters.priceMin);
    addParam(params, "scapeHeightMax", requestFilters.scapeHeightMax);
    addParam(params, "scapeHeightMin", requestFilters.scapeHeightMin);
    addParam(params, "yearMax", requestFilters.yearMax);
    addParam(params, "yearMin", requestFilters.yearMin);
    if (sort !== "relevance") params.set("sort", sort);
    params.sort();
    return params.toString();
  }, [debouncedQuery, requestFilters, sort]);

  const buildRequestParams = useCallback(
    (offset: number) => {
      const params = new URLSearchParams(shareParams);
      params.set("mode", "summary");
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      params.set("sort", sort);
      params.sort();
      return params;
    },
    [shareParams, sort],
  );

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestCounter.current;
    setLoading(true);
    setError(null);

    void fetch(`/api/v1/cultivars/search?${buildRequestParams(0)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
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
        if (requestId !== requestCounter.current) return;
        setResults(data.results);
        setNextOffset(data.pagination.nextOffset);
      })
      .catch((caughtError: unknown) => {
        if (controller.signal.aborted) return;
        setResults([]);
        setNextOffset(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Cultivar search could not be loaded.",
        );
      })
      .finally(() => {
        if (requestId === requestCounter.current) setLoading(false);
      });

    const nextUrl = shareParams ? `/cultivars?${shareParams}` : "/cultivars";
    window.history.replaceState(window.history.state, "", nextUrl);
    return () => controller.abort();
  }, [buildRequestParams, retryKey, shareParams]);

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

  const clearAll = () => {
    setQuery("");
    setDebouncedQuery("");
    setFilters(EMPTY_FILTERS);
    setRequestFilters(EMPTY_FILTERS);
    setSort("relevance");
  };

  const hasSearchState = Boolean(
    debouncedQuery ||
      Object.values(filters).some(Boolean) ||
      sort !== "relevance",
  );

  const loadMore = async () => {
    if (nextOffset === null || loadingMore) return;
    const requestId = requestCounter.current;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/cultivars/search?${buildRequestParams(nextOffset)}`,
      );
      if (!response.ok) throw new Error("More cultivars could not be loaded.");
      const data = (await response.json()) as CultivarSearchResponse;
      if (requestId !== requestCounter.current) return;
      setResults((current) => [...current, ...data.results]);
      setNextOffset(data.pagination.nextOffset);
    } catch (caughtError) {
      if (requestId !== requestCounter.current) return;
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "More cultivars could not be loaded.",
      );
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
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[#142118]/14 pb-4">
          <div>
            <h2
              id="cultivar-results-heading"
              className="text-2xl font-semibold text-[#142118]"
            >
              {debouncedQuery ? "Search results" : "Browse cultivars"}
            </h2>
            <p className="mt-1 text-sm text-[#617064]">
              Open a cultivar to see its details, photos, parentage, and public
              listings.
            </p>
          </div>

          <Select
            value={sort}
            onValueChange={(value) => setSort(value as CultivarSort)}
          >
            <SelectTrigger
              aria-label="Sort cultivars"
              className="ml-auto h-9 w-44 border-[#142118]/20 bg-white shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              onClick={() => setRetryKey((value) => value + 1)}
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
