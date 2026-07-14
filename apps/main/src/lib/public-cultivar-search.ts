import type { AhsDisplayListing } from "@/lib/utils/ahs-display";

export const PUBLIC_CULTIVAR_SEARCH_LIMIT = 48;

export interface PublicCultivarSearchFilters {
  bloomHabit?: string[];
  bloomSeason?: string[];
  bloomSizeMax?: number;
  bloomSizeMin?: number;
  branchesMax?: number;
  branchesMin?: number;
  budcountMax?: number;
  budcountMin?: number;
  color?: string;
  foliageType?: string[];
  form?: string[];
  fragrance?: string[];
  hasPhoto?: boolean;
  hybridizer?: string;
  parentage?: string;
  ploidy?: string[];
  q?: string;
  scapeHeightMax?: number;
  scapeHeightMin?: number;
  yearMax?: number;
  yearMin?: number;
}

export interface PublicCultivarSearchResult {
  ahsListing: AhsDisplayListing | null;
  hybridizer: string | null;
  imageUrl: string | null;
  name: string;
  normalizedName: string;
  segment: string;
  year: string | null;
}

export type PublicCultivarSearchParamRecord = Record<
  string,
  string | string[] | undefined
>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function stringValue(value: string | string[] | undefined) {
  const normalized = firstValue(value)?.trim();
  if (!normalized) return undefined;
  return normalized;
}

function stringValues(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalized = values.map((item) => item.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function numberValue(value: string | string[] | undefined) {
  const rawValue = firstValue(value)?.trim();
  if (!rawValue) return undefined;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parsePublicCultivarSearchParams(
  params: PublicCultivarSearchParamRecord,
): PublicCultivarSearchFilters {
  return {
    bloomHabit: stringValues(params.bloomHabit),
    bloomSeason: stringValues(params.bloomSeason),
    bloomSizeMax: numberValue(params.bloomSizeMax),
    bloomSizeMin: numberValue(params.bloomSizeMin),
    branchesMax: numberValue(params.branchesMax),
    branchesMin: numberValue(params.branchesMin),
    budcountMax: numberValue(params.budcountMax),
    budcountMin: numberValue(params.budcountMin),
    color: stringValue(params.color),
    foliageType: stringValues(params.foliageType),
    form: stringValues(params.form),
    fragrance: stringValues(params.fragrance),
    hasPhoto: ["1", "true"].includes(firstValue(params.hasPhoto) ?? ""),
    hybridizer: stringValue(params.hybridizer),
    parentage: stringValue(params.parentage),
    ploidy: stringValues(params.ploidy),
    q: stringValue(params.q),
    scapeHeightMax: numberValue(params.scapeHeightMax),
    scapeHeightMin: numberValue(params.scapeHeightMin),
    yearMax: numberValue(params.yearMax),
    yearMin: numberValue(params.yearMin),
  };
}
