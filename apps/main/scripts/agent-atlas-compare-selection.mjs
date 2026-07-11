/** @param {string[]} argv */
export function parseComparisonStories(argv) {
  const separator = argv.indexOf("--stories");
  if (separator === -1) return null;
  const value = argv[separator + 1];
  if (!value) throw new Error("--stories requires a comma-separated value.");
  return new Set(value.split(",").filter(Boolean));
}

/** @param {{ story?: string }} item @param {Set<string> | null} stories */
export function comparisonIncludes(item, stories) {
  return (
    stories === null || (item.story !== undefined && stories.has(item.story))
  );
}
