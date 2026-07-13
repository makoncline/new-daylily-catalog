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

/**
 * @param {{ key: string; story?: string }[]} baselineItems
 * @param {{ key: string }[]} currentRunItems
 * @param {Set<string> | null} stories
 */
export function removedBaselineItems(baselineItems, currentRunItems, stories) {
  const currentKeys = new Set(currentRunItems.map((item) => item.key));
  return baselineItems.filter(
    (item) => comparisonIncludes(item, stories) && !currentKeys.has(item.key),
  );
}
