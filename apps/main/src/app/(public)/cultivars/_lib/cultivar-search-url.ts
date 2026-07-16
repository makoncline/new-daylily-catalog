export const ADVANCED_CULTIVAR_SEARCH_PARAM_KEYS = [
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
  "scapeHeightMax",
  "scapeHeightMin",
  "sculptedType",
  "yearMax",
  "yearMin",
] as const;

export function hasAdvancedCultivarSearchState(
  hasParam: (key: string) => boolean,
) {
  return ADVANCED_CULTIVAR_SEARCH_PARAM_KEYS.some(hasParam);
}
