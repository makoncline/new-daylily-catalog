import type { Prisma } from "@prisma/client";
import { isV2CultivarDisplayDataEnabled } from "@/config/feature-flags";

export const ahsDisplayAhsListingSelect = {
  id: true,
  name: true,
  ahsImageUrl: true,
  hybridizer: true,
  year: true,
  scapeHeight: true,
  bloomSize: true,
  bloomSeason: true,
  ploidy: true,
  foliageType: true,
  bloomHabit: true,
  color: true,
  form: true,
  parentage: true,
  fragrance: true,
  budcount: true,
  branches: true,
  sculpting: true,
  foliage: true,
  flower: true,
} as const satisfies Prisma.AhsListingSelect;

export const v2AhsCultivarDisplaySelect = {
  id: true,
  post_title: true,
  introduction_date: true,
  primary_hybridizer_name: true,
  hybridizer_code_legacy: true,
  additional_hybridizers_names: true,
  bloom_season_names: true,
  fragrance_names: true,
  bloom_habit_names: true,
  foliage_names: true,
  ploidy_names: true,
  scape_height_in: true,
  bloom_size_in: true,
  bud_count: true,
  branches: true,
  color: true,
  flower_form_names: true,
  unusual_forms_names: true,
  parentage: true,
  image_url: true,
} as const satisfies Prisma.V2AhsCultivarSelect;

export type AhsDisplayListing = Prisma.AhsListingGetPayload<{
  select: typeof ahsDisplayAhsListingSelect;
}>;

export type V2AhsCultivarDisplaySource = Prisma.V2AhsCultivarGetPayload<{
  select: typeof v2AhsCultivarDisplaySelect;
}>;

interface AhsDisplayRelation {
  ahsListing?: AhsDisplayListing | null;
  v2AhsCultivar?: V2AhsCultivarDisplaySource | null;
}

export interface AhsDisplaySource extends AhsDisplayRelation {
  cultivarReference?: AhsDisplayRelation | null;
}

type WithDisplayAhsListing<TSource extends AhsDisplaySource> = Omit<
  TSource,
  "ahsListing"
> & {
  ahsListing: AhsDisplayListing | null;
};

export type WithResolvedDisplayAhsListing<TSource extends AhsDisplaySource> =
  WithDisplayAhsListing<TSource> &
    (TSource["cultivarReference"] extends infer TCultivarReference | null | undefined
      ? {
          cultivarReference: TCultivarReference extends object
            ? Omit<NonNullable<TCultivarReference>, "ahsListing"> & {
                ahsListing: AhsDisplayListing | null;
              }
            : TSource["cultivarReference"];
        }
      : unknown);

const directNamedHtmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  quot: '"',
  lt: "<",
  gt: ">",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  middot: "·",
  AElig: "Æ",
  Oslash: "Ø",
  aelig: "æ",
  oslash: "ø",
  yuml: "ÿ",
  szlig: "ß",
} as const;

const combiningMarks: Record<string, string> = {
  acute: "\u0301",
  grave: "\u0300",
  circ: "\u0302",
  tilde: "\u0303",
  uml: "\u0308",
  ring: "\u030A",
  cedil: "\u0327",
} as const;

const htmlEntityPattern = /&(#x[0-9a-fA-F]+|#\d+|[0-9A-Za-z]+);/g;

let htmlDecoder: HTMLTextAreaElement | null = null;

function formatNumericValue(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number.isInteger(value) ? String(value) : value.toString();
}

function formatInches(value: number | null | undefined) {
  const formatted = formatNumericValue(value);
  if (!formatted) {
    return null;
  }

  return `${formatted} inches`;
}

function formatInteger(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function getYearFromIntroductionDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = /^\s*(\d{4})/.exec(value);
  return match?.[1] ?? null;
}

function decodeNumericHtmlEntity(entity: string) {
  const isHex = entity.startsWith("#x") || entity.startsWith("#X");
  const rawCodePoint = isHex ? entity.slice(2) : entity.slice(1);
  const parsed = Number.parseInt(rawCodePoint, isHex ? 16 : 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  try {
    return String.fromCodePoint(parsed);
  } catch {
    return null;
  }
}

function isCombiningMarkName(value: string): value is keyof typeof combiningMarks {
  return value in combiningMarks;
}

function decodeNamedHtmlEntity(entity: string) {
  const direct = directNamedHtmlEntities[entity];
  if (direct) {
    return direct;
  }

  const accentMatch = /^([A-Za-z])(acute|grave|circ|tilde|uml|ring|cedil)$/.exec(
    entity,
  );
  if (!accentMatch) {
    return null;
  }

  const baseLetter = accentMatch[1];
  const accentName = accentMatch[2];
  if (!baseLetter || !accentName || !isCombiningMarkName(accentName)) {
    return null;
  }

  return `${baseLetter}${combiningMarks[accentName]}`.normalize("NFC");
}

function decodeLegacyHybridizerValue(value: string | null | undefined) {
  const trimmed = toNonEmptyDisplayValue(value);
  if (!trimmed) {
    return null;
  }

  if (typeof document !== "undefined") {
    htmlDecoder ??= document.createElement("textarea");
    htmlDecoder.innerHTML = trimmed;

    return toNonEmptyDisplayValue(htmlDecoder.value);
  }

  return toNonEmptyDisplayValue(
    trimmed.replace(htmlEntityPattern, (match, entity: string) => {
      if (entity.startsWith("#")) {
        return decodeNumericHtmlEntity(entity) ?? match;
      }

      return decodeNamedHtmlEntity(entity) ?? match;
    }),
  );
}

function toNonEmptyDisplayValue(value: string | null | undefined) {
  const trimmed = value?.trim() ?? null;

  if (trimmed === "") {
    return null;
  }

  return trimmed;
}

function joinDisplayValues(values: Array<string | null | undefined>) {
  const unique = Array.from(
    new Set(
      values
        .map((value) => toNonEmptyDisplayValue(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return unique.length > 0 ? unique.join(", ") : null;
}

function getLegacyAhsListing(source: AhsDisplaySource) {
  return source.ahsListing ?? source.cultivarReference?.ahsListing ?? null;
}

function getV2AhsCultivar(source: AhsDisplaySource) {
  return source.cultivarReference?.v2AhsCultivar ?? source.v2AhsCultivar ?? null;
}

function getV2HybridizerDisplayValue(v2AhsCultivar: V2AhsCultivarDisplaySource) {
  return (
    toNonEmptyDisplayValue(v2AhsCultivar.primary_hybridizer_name) ??
    decodeLegacyHybridizerValue(v2AhsCultivar.hybridizer_code_legacy) ??
    "unknown"
  );
}

export function mapV2AhsCultivarToDisplayAhsListing(
  v2AhsCultivar: V2AhsCultivarDisplaySource,
): AhsDisplayListing {
  return {
    id: v2AhsCultivar.id,
    name: v2AhsCultivar.post_title ?? null,
    ahsImageUrl: v2AhsCultivar.image_url ?? null,
    hybridizer: getV2HybridizerDisplayValue(v2AhsCultivar),
    year: getYearFromIntroductionDate(v2AhsCultivar.introduction_date),
    scapeHeight: formatInches(v2AhsCultivar.scape_height_in),
    bloomSize: formatInches(v2AhsCultivar.bloom_size_in),
    bloomSeason: v2AhsCultivar.bloom_season_names ?? null,
    ploidy: v2AhsCultivar.ploidy_names ?? null,
    foliageType: v2AhsCultivar.foliage_names ?? null,
    bloomHabit: v2AhsCultivar.bloom_habit_names ?? null,
    color: v2AhsCultivar.color ?? null,
    form: joinDisplayValues([
      v2AhsCultivar.flower_form_names,
      v2AhsCultivar.unusual_forms_names,
    ]),
    parentage: v2AhsCultivar.parentage ?? null,
    fragrance: v2AhsCultivar.fragrance_names ?? null,
    budcount: formatInteger(v2AhsCultivar.bud_count),
    branches: formatInteger(v2AhsCultivar.branches),
    sculpting: null,
    foliage: null,
    flower: null,
  };
}

export function getDisplayAhsListing(
  source: AhsDisplaySource,
): AhsDisplayListing | null {
  const legacyAhsListing = getLegacyAhsListing(source);

  if (!isV2CultivarDisplayDataEnabled()) {
    return legacyAhsListing;
  }

  const v2AhsCultivar = getV2AhsCultivar(source);
  if (!v2AhsCultivar) {
    return null;
  }

  return mapV2AhsCultivarToDisplayAhsListing(v2AhsCultivar);
}

export function withResolvedDisplayAhsListing<TSource extends AhsDisplaySource>(
  source: TSource,
): WithResolvedDisplayAhsListing<TSource> {
  const displayAhsListing = getDisplayAhsListing(source);

  return {
    ...source,
    ahsListing: displayAhsListing,
    cultivarReference: source.cultivarReference
      ? {
          ...source.cultivarReference,
          ahsListing: displayAhsListing,
        }
      : source.cultivarReference,
  } as WithResolvedDisplayAhsListing<TSource>;
}
