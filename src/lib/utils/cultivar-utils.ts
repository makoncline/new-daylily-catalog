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
