import { normalizeCanonicalText } from "@/lib/search-normalization";
import { slugify } from "@/lib/utils/slugify";

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

export function toCultivarRouteSegment(
  name: string | null | undefined,
): string | null {
  const normalized = normalizeCultivarName(name);
  if (!normalized) {
    return null;
  }

  const asciiNormalized = normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const segment = slugify(asciiNormalized);

  return segment || null;
}

export function getCultivarRouteCandidates(
  routeSegment: string | null | undefined,
): string[] {
  if (!routeSegment) {
    return [];
  }

  let decoded = routeSegment;
  try {
    decoded = decodeURIComponent(routeSegment);
  } catch {
    // Keep original segment when decode fails.
  }

  const candidates = new Set<string>();

  const normalizedExact = normalizeCultivarName(decoded);
  if (normalizedExact) {
    candidates.add(normalizedExact);
  }

  const normalizedWithSpaces = normalizeCultivarName(decoded.replace(/-+/g, " "));
  if (normalizedWithSpaces) {
    candidates.add(normalizedWithSpaces);
  }

  const addPossessiveVariants = (value: string | null) => {
    if (!value) {
      return;
    }

    const words = value.split(/\s+/);

    words.forEach((word, index) => {
      if (!/^[a-z0-9]+s$/i.test(word) || word.length < 2) {
        return;
      }

      const possessiveWords = [...words];
      possessiveWords[index] = `${word.slice(0, -1)}'s`;
      const possessiveCandidate = normalizeCultivarName(possessiveWords.join(" "));

      if (possessiveCandidate) {
        candidates.add(possessiveCandidate);
      }
    });
  };

  addPossessiveVariants(normalizedWithSpaces);

  const canonicalSegment = toCultivarRouteSegment(decoded);
  if (canonicalSegment) {
    candidates.add(canonicalSegment);

    const canonicalAsSpaces = normalizeCultivarName(
      canonicalSegment.replace(/-+/g, " "),
    );
    if (canonicalAsSpaces) {
      candidates.add(canonicalAsSpaces);
    }

    addPossessiveVariants(canonicalAsSpaces);
  }

  return Array.from(candidates);
}

export function fromCultivarRouteSegment(
  routeSegment: string | null | undefined,
): string | null {
  const candidates = getCultivarRouteCandidates(routeSegment);
  return candidates[1] ?? candidates[0] ?? null;
}
