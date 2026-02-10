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
