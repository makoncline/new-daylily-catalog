import { normalizeCanonicalText } from "@/lib/search-normalization";

const CULTIVAR_ROUTE_ALNUM_REGEX = /^[a-z0-9]$/;
const CULTIVAR_ROUTE_HEX_REGEX = /^[0-9a-f]{2}$/i;
const CULTIVAR_ROUTE_LITERAL_ESCAPE_REGEX = /[-_.!~*'()]/g;

/**
 * Normalizes a cultivar name for consistent storage and searching.
 * - Folds common Unicode punctuation variants
 * - Preserves apostrophes and hyphens
 * - Folds accents and compatibility Unicode forms
 * - Collapses repeated whitespace
 * - Converts to lowercase
 * - Returns null for empty/whitespace-only strings
 */
export function normalizeCultivarName(
  name: string | null | undefined,
): string | null {
  if (!name) {
    return null;
  }

  const normalized = normalizeCanonicalText(name);
  return normalized.length > 0 ? normalized : null;
}

/**
 * Formats a normalized cultivar name for human-friendly display.
 * Example: "happy returns" -> "Happy returns"
 */
export function toSentenceCaseCultivarName(
  name: string | null | undefined,
): string | null {
  const normalized = normalizeCultivarName(name);
  if (!normalized) {
    return null;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function encodeCultivarRouteCharacter(character: string): string {
  return encodeURIComponent(character)
    .replace(CULTIVAR_ROUTE_LITERAL_ESCAPE_REGEX, (value) =>
      `%${value.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    .replace(/%/g, "~")
    .toLowerCase();
}

export function toCultivarRouteSegment(
  name: string | null | undefined,
): string | null {
  const normalized = normalizeCultivarName(name);
  if (!normalized) {
    return null;
  }

  let segment = "";

  for (const character of normalized) {
    if (CULTIVAR_ROUTE_ALNUM_REGEX.test(character)) {
      segment += character;
      continue;
    }

    if (character === " ") {
      segment += "-";
      continue;
    }

    segment += encodeCultivarRouteCharacter(character);
  }

  return segment;
}

function decodeCultivarRouteSegment(
  routeSegment: string | null | undefined,
): string | null {
  if (!routeSegment) {
    return null;
  }

  let percentEncoded = "";

  for (let index = 0; index < routeSegment.length; index += 1) {
    const character = routeSegment.charAt(index);

    if (CULTIVAR_ROUTE_ALNUM_REGEX.test(character)) {
      percentEncoded += character;
      continue;
    }

    if (character === "-") {
      percentEncoded += " ";
      continue;
    }

    if (character !== "~") {
      return null;
    }

    const hexValue = routeSegment.slice(index + 1, index + 3);
    if (!CULTIVAR_ROUTE_HEX_REGEX.test(hexValue)) {
      return null;
    }

    percentEncoded += `%${hexValue}`;
    index += 2;
  }

  try {
    return normalizeCultivarName(decodeURIComponent(percentEncoded));
  } catch {
    return null;
  }
}

export function fromCultivarRouteSegment(
  routeSegment: string | null | undefined,
): string | null {
  const normalized = decodeCultivarRouteSegment(routeSegment);
  if (!normalized) {
    return null;
  }

  return toCultivarRouteSegment(normalized) === routeSegment ? normalized : null;
}
