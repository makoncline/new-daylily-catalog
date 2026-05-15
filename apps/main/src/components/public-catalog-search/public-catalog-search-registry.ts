import { type Table } from "@tanstack/react-table";
import {
  parseNumericRange,
  splitFacetValue,
  splitFormFacetValue,
  type NumericRange,
} from "./public-catalog-search-filter-utils";
import {
  type PublicCatalogSearchFacetOption,
  type PublicCatalogSearchFacetOptions,
} from "./public-catalog-search-types";
import { normalizeSearchText } from "@/lib/search-normalization";

type PublicCatalogSearchFilterKind = "text" | "range" | "facet" | "boolean";

type PublicCatalogSearchFilterSectionId =
  | "listing"
  | "registration"
  | "traits"
  | "details"
  | "toolbar";

export interface PublicCatalogSearchFilterDefinition {
  id: string;
  label: string;
  sectionId: PublicCatalogSearchFilterSectionId;
  kind: PublicCatalogSearchFilterKind;
  testId: string;
  placeholder?: string;
  unit?: string;
  facetKey?: keyof PublicCatalogSearchFacetOptions | "lists";
  icon?: "camera" | "dollar" | "link";
}

export interface PublicCatalogSearchSectionDefinition {
  id: Exclude<PublicCatalogSearchFilterSectionId, "toolbar">;
  label: string;
  filters: PublicCatalogSearchFilterDefinition[];
  groups: Array<{
    filterIds: string[];
    className?: string;
  }>;
}

type FilterDef = PublicCatalogSearchFilterDefinition;
type SectionDef = PublicCatalogSearchSectionDefinition;

export const PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS: FilterDef[] = [
  {
    id: "price",
    label: "For Sale",
    sectionId: "toolbar",
    kind: "boolean",
    testId: "advanced-filter-for-sale",
    icon: "dollar",
  },
  {
    id: "hasPhoto",
    label: "Has Photo",
    sectionId: "toolbar",
    kind: "boolean",
    testId: "advanced-filter-has-photo",
    icon: "camera",
  },
  {
    id: "lists",
    label: "Lists",
    sectionId: "toolbar",
    kind: "facet",
    testId: "advanced-filter-lists",
    facetKey: "lists",
  },
];

export const PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS: SectionDef[] = [
  {
    id: "listing",
    label: "Listing",
    groups: [
      {
        filterIds: ["title", "description", "priceValue"],
        className: "space-y-4",
      },
    ],
    filters: [
      {
        id: "title",
        label: "Title",
        sectionId: "listing",
        kind: "text",
        placeholder: "Search listing title",
        testId: "advanced-filter-title",
      },
      {
        id: "description",
        label: "Description",
        sectionId: "listing",
        kind: "text",
        placeholder: "Search description",
        testId: "advanced-filter-description",
      },
      {
        id: "priceValue",
        label: "Price",
        sectionId: "listing",
        kind: "range",
        testId: "advanced-filter-price-range",
        unit: "$",
      },
    ],
  },
  {
    id: "registration",
    label: "Registration",
    groups: [
      {
        filterIds: ["cultivarName", "linkedToCultivar", "hybridizer", "year"],
        className: "space-y-4",
      },
    ],
    filters: [
      {
        id: "cultivarName",
        label: "Cultivar",
        sectionId: "registration",
        kind: "text",
        placeholder: "Search cultivar name",
        testId: "advanced-filter-cultivar-name",
      },
      {
        id: "linkedToCultivar",
        label: "Linked to Cultivar",
        sectionId: "registration",
        kind: "boolean",
        testId: "advanced-filter-linked-to-cultivar",
        icon: "link",
      },
      {
        id: "hybridizer",
        label: "Hybridizer",
        sectionId: "registration",
        kind: "text",
        placeholder: "Search hybridizer",
        testId: "advanced-filter-hybridizer",
      },
      {
        id: "year",
        label: "Year",
        sectionId: "registration",
        kind: "range",
        testId: "advanced-filter-year",
      },
    ],
  },
  {
    id: "traits",
    label: "Bloom Traits",
    groups: [
      {
        filterIds: ["bloomHabit", "bloomSeason"],
        className: "flex flex-wrap gap-2",
      },
      {
        filterIds: ["scapeHeight", "bloomSize", "budcount", "branches"],
        className: "space-y-4",
      },
    ],
    filters: [
      {
        id: "bloomHabit",
        label: "Bloom Habit",
        sectionId: "traits",
        kind: "facet",
        facetKey: "bloomHabit",
        testId: "advanced-filter-bloom-habit",
      },
      {
        id: "bloomSeason",
        label: "Bloom Season",
        sectionId: "traits",
        kind: "facet",
        facetKey: "bloomSeason",
        testId: "advanced-filter-bloom-season",
      },
      {
        id: "scapeHeight",
        label: "Scape Height",
        sectionId: "traits",
        kind: "range",
        unit: "in.",
        testId: "advanced-filter-scape-height",
      },
      {
        id: "bloomSize",
        label: "Bloom Size",
        sectionId: "traits",
        kind: "range",
        unit: "in.",
        testId: "advanced-filter-bloom-size",
      },
      {
        id: "budcount",
        label: "Bud Count",
        sectionId: "traits",
        kind: "range",
        testId: "advanced-filter-budcount",
      },
      {
        id: "branches",
        label: "Branches",
        sectionId: "traits",
        kind: "range",
        testId: "advanced-filter-branches",
      },
    ],
  },
  {
    id: "details",
    label: "Classification & Details",
    groups: [
      {
        filterIds: ["form", "ploidy", "foliageType", "fragrance"],
        className: "flex flex-wrap gap-2",
      },
      {
        filterIds: ["color", "parentage"],
        className: "space-y-4",
      },
    ],
    filters: [
      {
        id: "form",
        label: "Form",
        sectionId: "details",
        kind: "facet",
        facetKey: "form",
        testId: "advanced-filter-form",
      },
      {
        id: "ploidy",
        label: "Ploidy",
        sectionId: "details",
        kind: "facet",
        facetKey: "ploidy",
        testId: "advanced-filter-ploidy",
      },
      {
        id: "foliageType",
        label: "Foliage Type",
        sectionId: "details",
        kind: "facet",
        facetKey: "foliageType",
        testId: "advanced-filter-foliage-type",
      },
      {
        id: "fragrance",
        label: "Fragrance",
        sectionId: "details",
        kind: "facet",
        facetKey: "fragrance",
        testId: "advanced-filter-fragrance",
      },
      {
        id: "color",
        label: "Color",
        sectionId: "details",
        kind: "text",
        placeholder: "Search color notes",
        testId: "advanced-filter-color",
      },
      {
        id: "parentage",
        label: "Parentage",
        sectionId: "details",
        kind: "text",
        placeholder: "Search parentage",
        testId: "advanced-filter-parentage",
      },
    ],
  },
];

const PUBLIC_CATALOG_SEARCH_FILTERS = [
  ...PUBLIC_CATALOG_SEARCH_TOOLBAR_FILTERS,
  ...PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS.flatMap(
    (section) => section.filters,
  ),
];

const FILTER_BY_ID = new Map(
  PUBLIC_CATALOG_SEARCH_FILTERS.map((definition) => [
    definition.id,
    definition,
  ]),
);

interface CatalogSearchAhsFacetValues {
  bloomHabit?: string | null;
  bloomSeason?: string | null;
  form?: string | null;
  ploidy?: string | null;
  foliageType?: string | null;
  fragrance?: string | null;
}

interface CatalogSearchFacetRow {
  ahsListing?: CatalogSearchAhsFacetValues | null;
}

interface CatalogSearchListRow {
  lists?: Array<{ id: string; title: string }>;
}

const FACET_VALUE_GETTERS: Record<
  keyof PublicCatalogSearchFacetOptions,
  (listing: CatalogSearchFacetRow) => string | null | undefined
> = {
  bloomHabit: (listing) => listing.ahsListing?.bloomHabit,
  bloomSeason: (listing) => listing.ahsListing?.bloomSeason,
  form: (listing) => listing.ahsListing?.form,
  ploidy: (listing) => listing.ahsListing?.ploidy,
  foliageType: (listing) => listing.ahsListing?.foliageType,
  fragrance: (listing) => listing.ahsListing?.fragrance,
};

function formatRangeNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(1)));
}

function formatRangeSummary(range: NumericRange) {
  const parts: string[] = [];

  if (range.min !== null) {
    parts.push(formatRangeNumber(range.min));
  }

  if (range.max !== null) {
    parts.push(formatRangeNumber(range.max));
  }

  return parts.join(" - ");
}

function getListLabelMap(listOptions: PublicCatalogSearchFacetOption[]) {
  return new Map(listOptions.map((option) => [option.value, option.label]));
}

function getLabelForFacetValue(
  definition: PublicCatalogSearchFilterDefinition | null,
  value: string,
  listOptions: PublicCatalogSearchFacetOption[],
) {
  if (definition?.facetKey !== "lists") {
    return value;
  }

  const label = getListLabelMap(listOptions).get(value) ?? value;
  return label.length > 35
    ? `${label.slice(0, 20)}…${label.slice(-10)}`
    : label;
}

export function getPublicCatalogSearchFilterDefinition(
  id: string,
): PublicCatalogSearchFilterDefinition | null {
  return FILTER_BY_ID.get(id) ?? null;
}

function getPublicCatalogSearchSectionDefinition(
  id: PublicCatalogSearchSectionDefinition["id"],
): PublicCatalogSearchSectionDefinition | null {
  return (
    PUBLIC_CATALOG_SEARCH_SECTION_DEFINITIONS.find(
      (section) => section.id === id,
    ) ?? null
  );
}

export function getPublicCatalogSearchFilterColumn<TData>(
  table: Table<TData>,
  definition: PublicCatalogSearchFilterDefinition,
) {
  return table.getColumn(definition.id) ?? null;
}

export function getPublicCatalogSearchFacetOptionsForDefinition(
  definition: PublicCatalogSearchFilterDefinition,
  listOptions: PublicCatalogSearchFacetOption[],
  facetOptions: PublicCatalogSearchFacetOptions,
): PublicCatalogSearchFacetOption[] {
  switch (definition.facetKey) {
    case "lists":
      return listOptions;
    case "bloomHabit":
      return facetOptions.bloomHabit;
    case "bloomSeason":
      return facetOptions.bloomSeason;
    case "form":
      return facetOptions.form;
    case "ploidy":
      return facetOptions.ploidy;
    case "foliageType":
      return facetOptions.foliageType;
    case "fragrance":
      return facetOptions.fragrance;
    default:
      return [];
  }
}

export function buildPublicCatalogSearchListOptions<
  TListing extends CatalogSearchListRow,
>(
  lists: readonly { id: string; title: string }[],
  listings: TListing[],
): PublicCatalogSearchFacetOption[] {
  const listCounts = new Map<string, number>();

  listings.forEach((listing) => {
    listing.lists?.forEach((list) => {
      listCounts.set(list.id, (listCounts.get(list.id) ?? 0) + 1);
    });
  });

  return lists.map((list) => ({
    label: list.title,
    value: list.id,
    count: listCounts.get(list.id) ?? 0,
  }));
}

export function buildPublicCatalogSearchFacetOptions<
  TListing extends CatalogSearchFacetRow,
>(listings: TListing[]): PublicCatalogSearchFacetOptions {
  const buildFacetOptions = (
    getValue: (listing: TListing) => string | null | undefined,
    splitValue = splitFacetValue,
  ) => {
    const counts = new Map<string, { label: string; count: number }>();

    listings.forEach((listing) => {
      for (const label of splitValue(getValue(listing))) {
        const key = normalizeSearchText(label);
        const existing = counts.get(key);

        if (key.length === 0) {
          continue;
        }

        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, { label, count: 1 });
        }
      }
    });

    return Array.from(counts.values())
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((option) => ({
        label: option.label,
        value: option.label,
        count: option.count,
      }));
  };

  return {
    bloomHabit: buildFacetOptions(FACET_VALUE_GETTERS.bloomHabit),
    bloomSeason: buildFacetOptions(FACET_VALUE_GETTERS.bloomSeason),
    form: buildFacetOptions(FACET_VALUE_GETTERS.form, splitFormFacetValue),
    ploidy: buildFacetOptions(FACET_VALUE_GETTERS.ploidy),
    foliageType: buildFacetOptions(FACET_VALUE_GETTERS.foliageType),
    fragrance: buildFacetOptions(FACET_VALUE_GETTERS.fragrance),
  };
}

export function buildPublicCatalogSearchColumnNames() {
  return PUBLIC_CATALOG_SEARCH_FILTERS.reduce<Record<string, string>>(
    (acc, definition) => {
      acc[definition.id] = definition.label;
      return acc;
    },
    {},
  );
}

function isPublicCatalogSearchFilterValueActive(value: unknown) {
  if (value === undefined || value === null || value === false) {
    return false;
  }

  if (typeof value === "string") {
    return value.length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function countPublicCatalogSearchActiveFilters<TData>(
  table: Table<TData>,
  filterIds: string[],
) {
  return filterIds.filter((filterId) =>
    isPublicCatalogSearchFilterValueActive(
      table.getColumn(filterId)?.getFilterValue(),
    ),
  ).length;
}

export function countPublicCatalogSearchSectionFilters<TData>(
  table: Table<TData>,
  sectionId: PublicCatalogSearchSectionDefinition["id"],
) {
  const section = getPublicCatalogSearchSectionDefinition(sectionId);
  if (!section) {
    return 0;
  }

  return countPublicCatalogSearchActiveFilters(
    table,
    section.filters.map((filter) => filter.id),
  );
}

export function formatPublicCatalogSearchFilterSummary(args: {
  definition: PublicCatalogSearchFilterDefinition | null;
  listOptions: PublicCatalogSearchFacetOption[];
  value: unknown;
}) {
  const { definition, listOptions, value } = args;
  const label = definition?.label ?? "Filter";

  if (value === true || value === "true" || value === "1") {
    return label;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return label;
    }

    if (value.length === 1) {
      const optionLabel = getLabelForFacetValue(
        definition,
        String(value[0] ?? ""),
        listOptions,
      );

      return `${label}: ${optionLabel}`;
    }

    return `${label}: ${value.length} selected`;
  }

  if (typeof value === "string" && value.length > 0) {
    if (definition?.kind === "range") {
      const range = parseNumericRange(value);
      if (range) {
        const summary = formatRangeSummary(range);
        return summary.length > 0 ? `${label}: ${summary}` : label;
      }
    }

    return `${label}: ${value}`;
  }

  if (definition?.kind === "range") {
    const range = parseNumericRange(value);
    if (range) {
      const summary = formatRangeSummary(range);
      return summary.length > 0 ? `${label}: ${summary}` : label;
    }
  }

  return label;
}
