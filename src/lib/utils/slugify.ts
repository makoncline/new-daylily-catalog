// Regex patterns for slug validation
export const SLUG_INPUT_PATTERN = /^[a-z0-9-_\s]*$/;
export const SLUG_FINAL_PATTERN = /^[a-z0-9-_]+$/;
export const SLUG_MIN_LENGTH = 5;
export const SLUG_MAX_LENGTH = 50;

export const slugValidation = {
  inputPattern: SLUG_INPUT_PATTERN,
  finalPattern: SLUG_FINAL_PATTERN,
  minLength: SLUG_MIN_LENGTH,
  maxLength: SLUG_MAX_LENGTH,
  inputMessage:
    "Only lowercase letters, numbers, hyphens, and underscores are allowed. (a-z 0-9 - _)",
  finalMessage:
    "Only lowercase letters, numbers, hyphens, and underscores are allowed in the final URL.",
  lengthMessage: "URL must be between 5 and 50 characters long",
};

/**
 * Validates if a string is a valid final slug
 * Must be lowercase, only letters, numbers, hyphens, and underscores
 */
export function isValidSlug(value: string): boolean {
  return (
    SLUG_FINAL_PATTERN.test(value) &&
    value.length >= SLUG_MIN_LENGTH &&
    value.length <= SLUG_MAX_LENGTH
  );
}

/**
 * Transforms a string into a valid slug according to our application's rules.
 * - Converts to lowercase
 * - Only allows letters, numbers, hyphens, underscores, and spaces
 * - Removes leading/trailing spaces
 * - Must be at least 5 characters
 *
 * @param value - The string to transform into a slug
 * @param fallback - Optional fallback value if the resulting slug would be invalid (< 5 chars)
 * @returns The transformed slug, or the fallback if provided and needed
 */
export function transformToSlug(
  value: string | null,
  fallback?: string,
): string | null {
  if (!value) return null;

  const processed = slugify(value);

  // If processed slug is too short and we have a fallback, use it
  if (!isValidSlug(processed)) {
    return fallback ?? null;
  }

  return processed;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}
