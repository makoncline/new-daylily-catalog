export type CultivarSort = "relevance" | "name" | "newest" | "mostListed";

export const DEFAULT_CULTIVAR_SORT: CultivarSort = "name";

export interface InitialCultivarSearchState {
  advanced?: boolean;
  award?: string;
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
  flowerShow?: string;
  form?: string;
  fragrance?: string;
  hasCultivarPhoto: boolean;
  hasForSaleListings: boolean;
  hasListings: boolean;
  hybridizer?: string;
  parentage?: string;
  ploidy?: string;
  q: string;
  rebloom?: boolean;
  scapeHeightMax?: string;
  scapeHeightMin?: string;
  sculptedType?: string;
  sort?: string;
  yearMax?: string;
  yearMin?: string;
}

export interface CultivarSearchFilters {
  award: string;
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
  flowerShow: string;
  form: string;
  fragrance: string;
  hasCultivarPhoto: boolean;
  hasForSaleListings: boolean;
  hasListings: boolean;
  hybridizer: string;
  parentage: string;
  ploidy: string;
  rebloom: boolean;
  scapeHeightMax: string;
  scapeHeightMin: string;
  sculptedType: string;
  yearMax: string;
  yearMin: string;
}

export const EMPTY_FILTERS: CultivarSearchFilters = {
  award: "",
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
  flowerShow: "",
  form: "",
  fragrance: "",
  hasCultivarPhoto: false,
  hasForSaleListings: false,
  hasListings: true,
  hybridizer: "",
  parentage: "",
  ploidy: "",
  rebloom: false,
  scapeHeightMax: "",
  scapeHeightMin: "",
  sculptedType: "",
  yearMax: "",
  yearMin: "",
};

export const SORT_OPTIONS: Array<{ label: string; value: CultivarSort }> = [
  { label: "Name A–Z", value: "name" },
  { label: "Best match", value: "relevance" },
  { label: "Newest introductions", value: "newest" },
  { label: "Most listed", value: "mostListed" },
];

const ADVANCED_CULTIVAR_SEARCH_PARAM_KEYS = [
  "award",
  "bloomHabit",
  "bloomSizeMax",
  "bloomSizeMin",
  "bloomSeason",
  "branchesMax",
  "branchesMin",
  "budCountMax",
  "budCountMin",
  "color",
  "cultivarName",
  "foliageType",
  "flowerShow",
  "form",
  "fragrance",
  "hybridizer",
  "parentage",
  "ploidy",
  "rebloom",
  "scapeHeightMax",
  "scapeHeightMin",
  "sculptedType",
  "yearMax",
  "yearMin",
] as const;

function isCultivarSort(value: string | undefined): value is CultivarSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function getInitialFilters(
  initialState: InitialCultivarSearchState,
): CultivarSearchFilters {
  return {
    award: initialState.award ?? EMPTY_FILTERS.award,
    bloomHabit: initialState.bloomHabit ?? EMPTY_FILTERS.bloomHabit,
    bloomSizeMax: initialState.bloomSizeMax ?? EMPTY_FILTERS.bloomSizeMax,
    bloomSizeMin: initialState.bloomSizeMin ?? EMPTY_FILTERS.bloomSizeMin,
    bloomSeason: initialState.bloomSeason ?? EMPTY_FILTERS.bloomSeason,
    branchesMax: initialState.branchesMax ?? EMPTY_FILTERS.branchesMax,
    branchesMin: initialState.branchesMin ?? EMPTY_FILTERS.branchesMin,
    budCountMax: initialState.budCountMax ?? EMPTY_FILTERS.budCountMax,
    budCountMin: initialState.budCountMin ?? EMPTY_FILTERS.budCountMin,
    color: initialState.color ?? EMPTY_FILTERS.color,
    cultivarName: initialState.cultivarName ?? EMPTY_FILTERS.cultivarName,
    foliageType: initialState.foliageType ?? EMPTY_FILTERS.foliageType,
    flowerShow: initialState.flowerShow ?? EMPTY_FILTERS.flowerShow,
    form: initialState.form ?? EMPTY_FILTERS.form,
    fragrance: initialState.fragrance ?? EMPTY_FILTERS.fragrance,
    hasCultivarPhoto: initialState.hasCultivarPhoto,
    hasForSaleListings: initialState.hasForSaleListings,
    hasListings: initialState.hasListings,
    hybridizer: initialState.hybridizer ?? EMPTY_FILTERS.hybridizer,
    parentage: initialState.parentage ?? EMPTY_FILTERS.parentage,
    ploidy: initialState.ploidy ?? EMPTY_FILTERS.ploidy,
    rebloom: initialState.rebloom ?? EMPTY_FILTERS.rebloom,
    scapeHeightMax: initialState.scapeHeightMax ?? EMPTY_FILTERS.scapeHeightMax,
    scapeHeightMin: initialState.scapeHeightMin ?? EMPTY_FILTERS.scapeHeightMin,
    sculptedType: initialState.sculptedType ?? EMPTY_FILTERS.sculptedType,
    yearMax: initialState.yearMax ?? EMPTY_FILTERS.yearMax,
    yearMin: initialState.yearMin ?? EMPTY_FILTERS.yearMin,
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

export function getCultivarSearchControls(
  initialState: InitialCultivarSearchState,
) {
  return {
    advanced: initialState.advanced ?? false,
    filters: getInitialFilters(initialState),
    query: initialState.q,
    sort: isCultivarSort(initialState.sort)
      ? initialState.sort
      : DEFAULT_CULTIVAR_SORT,
  };
}

export function parseCultivarSearchUrl(
  getParam: (key: string) => string | null | undefined,
): InitialCultivarSearchState {
  const urlState: InitialCultivarSearchState = {
    advanced:
      getParam("advanced") === "true" ||
      ADVANCED_CULTIVAR_SEARCH_PARAM_KEYS.some((key) => getParam(key) != null),
    award: getParam("award") ?? undefined,
    bloomHabit: getParam("bloomHabit") ?? undefined,
    bloomSizeMax: getParam("bloomSizeMax") ?? undefined,
    bloomSizeMin: getParam("bloomSizeMin") ?? undefined,
    bloomSeason: getParam("bloomSeason") ?? undefined,
    branchesMax: getParam("branchesMax") ?? undefined,
    branchesMin: getParam("branchesMin") ?? undefined,
    budCountMax: getParam("budCountMax") ?? undefined,
    budCountMin: getParam("budCountMin") ?? undefined,
    color: getParam("color") ?? undefined,
    cultivarName: getParam("cultivarName") ?? undefined,
    foliageType: getParam("foliageType") ?? undefined,
    flowerShow: getParam("flowerShow") ?? undefined,
    form: getParam("form") ?? undefined,
    fragrance: getParam("fragrance") ?? undefined,
    hasCultivarPhoto: getParam("hasCultivarPhoto") === "true",
    hasForSaleListings: getParam("hasForSaleListings") === "true",
    hasListings: getParam("hasListings") !== "false",
    hybridizer: getParam("hybridizer") ?? undefined,
    parentage: getParam("parentage") ?? undefined,
    ploidy: getParam("ploidy") ?? undefined,
    q: getParam("q") ?? "",
    rebloom: getParam("rebloom") === "true",
    scapeHeightMax: getParam("scapeHeightMax") ?? undefined,
    scapeHeightMin: getParam("scapeHeightMin") ?? undefined,
    sculptedType: getParam("sculptedType") ?? undefined,
    sort: getParam("sort") ?? DEFAULT_CULTIVAR_SORT,
    yearMax: getParam("yearMax") ?? undefined,
    yearMin: getParam("yearMin") ?? undefined,
  };

  return urlState;
}

export function serializeCultivarSearchUrl({
  advanced = false,
  filters,
  query,
  sort,
}: {
  advanced?: boolean;
  filters: CultivarSearchFilters;
  query: string;
  sort: CultivarSort;
}) {
  const params = new URLSearchParams();
  addFacetParam(params, "award", filters.award);
  addParam(params, "q", query);
  addFacetParam(params, "bloomHabit", filters.bloomHabit);
  addParam(params, "bloomSizeMax", filters.bloomSizeMax);
  addParam(params, "bloomSizeMin", filters.bloomSizeMin);
  addFacetParam(params, "bloomSeason", filters.bloomSeason);
  addParam(params, "branchesMax", filters.branchesMax);
  addParam(params, "branchesMin", filters.branchesMin);
  addParam(params, "budCountMax", filters.budCountMax);
  addParam(params, "budCountMin", filters.budCountMin);
  addParam(params, "color", filters.color);
  addParam(params, "cultivarName", filters.cultivarName);
  addFacetParam(params, "foliageType", filters.foliageType);
  addFacetParam(params, "flowerShow", filters.flowerShow);
  addFacetParam(params, "form", filters.form);
  addFacetParam(params, "fragrance", filters.fragrance);
  addParam(params, "hasCultivarPhoto", filters.hasCultivarPhoto);
  addParam(params, "hasForSaleListings", filters.hasForSaleListings);
  if (!filters.hasListings) params.set("hasListings", "false");
  addFacetParam(params, "hybridizer", filters.hybridizer);
  addParam(params, "parentage", filters.parentage);
  addFacetParam(params, "ploidy", filters.ploidy);
  addParam(params, "rebloom", filters.rebloom);
  addParam(params, "scapeHeightMax", filters.scapeHeightMax);
  addParam(params, "scapeHeightMin", filters.scapeHeightMin);
  addFacetParam(params, "sculptedType", filters.sculptedType);
  addParam(params, "yearMax", filters.yearMax);
  addParam(params, "yearMin", filters.yearMin);
  if (sort !== DEFAULT_CULTIVAR_SORT) params.set("sort", sort);
  if (advanced) params.set("advanced", "true");
  params.sort();
  return params.toString();
}
