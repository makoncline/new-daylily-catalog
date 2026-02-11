/**
 * Normalizes a cultivar name for consistent storage and searching.
 * - Trims whitespace
 * - Converts to lowercase
 * - Returns null for empty/whitespace-only strings
 */
export function normalizeCultivarName(
  name: string | null | undefined,
): string | null {
  const trimmed = name?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
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

  const slug = normalized.replace(/\s+/g, "-").replace(/-+/g, "-");
  return encodeURIComponent(slug);
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

  return Array.from(candidates);
}

export function fromCultivarRouteSegment(
  routeSegment: string | null | undefined,
): string | null {
  const candidates = getCultivarRouteCandidates(routeSegment);
  return candidates[1] ?? candidates[0] ?? null;
}
