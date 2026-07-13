// Regex patterns for slug validation
export const SLUG_INPUT_PATTERN = /^[a-z0-9_\s\-]*$/;
const SLUG_FINAL_PATTERN = /^[a-z0-9-_]+$/;
const SLUG_MIN_LENGTH = 5;
const SLUG_MAX_LENGTH = 50;

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
