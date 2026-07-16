export type CultivarSearchTelemetryProperties = Record<
  string,
  boolean | number | string | undefined
>;

type TelemetryParamKind = "boolean" | "number" | "text";

interface TelemetryParamDefinition {
  kind: TelemetryParamKind;
  param: string;
  property: string;
}

const SEARCH_FILTER_PARAMS: TelemetryParamDefinition[] = [
  { kind: "text", param: "bloomHabit", property: "bloom_habit" },
  { kind: "number", param: "bloomSizeMax", property: "bloom_size_max" },
  { kind: "number", param: "bloomSizeMin", property: "bloom_size_min" },
  { kind: "text", param: "bloomSeason", property: "bloom_season" },
  { kind: "number", param: "branchesMax", property: "branches_max" },
  { kind: "number", param: "branchesMin", property: "branches_min" },
  { kind: "number", param: "budCountMax", property: "bud_count_max" },
  { kind: "number", param: "budCountMin", property: "bud_count_min" },
  { kind: "text", param: "color", property: "color" },
  { kind: "text", param: "cultivarName", property: "cultivar_name" },
  { kind: "text", param: "foliageType", property: "foliage_type" },
  { kind: "text", param: "form", property: "form" },
  { kind: "text", param: "fragrance", property: "fragrance" },
  {
    kind: "boolean",
    param: "hasCultivarPhoto",
    property: "has_cultivar_photo",
  },
  {
    kind: "boolean",
    param: "hasForSaleListings",
    property: "has_for_sale_listings",
  },
  { kind: "boolean", param: "hasPhoto", property: "has_listing_photo" },
  { kind: "boolean", param: "hasListings", property: "has_listings" },
  { kind: "text", param: "hybridizer", property: "hybridizer" },
  {
    kind: "text",
    param: "listingDescription",
    property: "listing_description",
  },
  { kind: "text", param: "listingTitle", property: "listing_title" },
  { kind: "text", param: "parentage", property: "parentage" },
  { kind: "text", param: "ploidy", property: "ploidy" },
  { kind: "number", param: "priceMax", property: "price_max" },
  { kind: "number", param: "priceMin", property: "price_min" },
  {
    kind: "number",
    param: "scapeHeightMax",
    property: "scape_height_max",
  },
  {
    kind: "number",
    param: "scapeHeightMin",
    property: "scape_height_min",
  },
  { kind: "number", param: "yearMax", property: "year_max" },
  { kind: "number", param: "yearMin", property: "year_min" },
];

function normalizeText(value: string | null) {
  const normalized = value
    ?.replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase()
    .slice(0, 120);

  if (normalized === "") return undefined;
  return normalized;
}

function getNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getBoolean(value: string | null) {
  if (!value) return undefined;
  return value === "true" || value === "1";
}

export function getCultivarSearchTelemetryProperties(
  params: URLSearchParams,
): CultivarSearchTelemetryProperties {
  const properties: CultivarSearchTelemetryProperties = {};
  const activeFilters: string[] = [];

  for (const definition of SEARCH_FILTER_PARAMS) {
    const rawValue = params.get(definition.param);
    let value: boolean | number | string | undefined;

    if (definition.kind === "boolean") {
      value = getBoolean(rawValue) ? true : undefined;
    } else if (definition.kind === "number") {
      value = getNumber(rawValue);
    } else {
      value = normalizeText(rawValue);
    }

    if (value === undefined) continue;
    activeFilters.push(definition.property);
    properties[definition.property] = value;
  }

  activeFilters.sort();
  const query = normalizeText(params.get("q"));
  const limit = getNumber(params.get("limit"));
  const offset = getNumber(params.get("offset")) ?? 0;

  return {
    ...properties,
    active_filters: activeFilters.join("|"),
    filter_count: activeFilters.length,
    limit,
    offset,
    page_number: limit ? Math.floor(offset / limit) + 1 : undefined,
    photos_first: getBoolean(params.get("photosFirst")),
    query,
    query_kind: query
      ? activeFilters.length > 0
        ? "query_and_filters"
        : "query"
      : activeFilters.length > 0
        ? "filters_only"
        : "browse",
    sort: params.get("sort") ?? "relevance",
  };
}
