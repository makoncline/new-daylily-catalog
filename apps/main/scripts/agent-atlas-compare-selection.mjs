/** @param {string[]} argv */
export function parseComparisonStories(argv) {
  const separator = argv.indexOf("--stories");
  if (separator === -1) return null;
  const value = argv[separator + 1];
  if (!value) throw new Error("--stories requires a comma-separated value.");
  return new Set(value.split(",").filter(Boolean));
}

/** @param {string[]} argv */
export function parseComparisonCaptureNames(argv) {
  const separator = argv.indexOf("--captures");
  if (separator === -1) return null;
  const value = argv[separator + 1];
  if (!value) throw new Error("--captures requires a comma-separated value.");
  return new Set(value.split(",").filter(Boolean));
}

/** @param {string[]} argv */
export function parseComparisonProjects(argv) {
  const separator = argv.indexOf("--projects");
  if (separator === -1) return null;
  const value = argv[separator + 1];
  if (!value) throw new Error("--projects requires a comma-separated value.");
  return new Set(value.split(",").filter(Boolean));
}

/** @param {{ story?: string; name?: string; project?: string }} item @param {Set<string> | null} stories @param {Set<string> | null} [captureNames] @param {Set<string> | null} [projects] */
export function comparisonIncludes(
  item,
  stories,
  captureNames = null,
  projects = null,
) {
  const captureName =
    item.name && item.project && item.name.startsWith(`${item.project}-`)
      ? item.name.slice(item.project.length + 1)
      : item.name;
  return (
    (stories === null ||
      (item.story !== undefined && stories.has(item.story))) &&
    (captureNames === null ||
      (captureName !== undefined && captureNames.has(captureName))) &&
    (projects === null ||
      (item.project !== undefined && projects.has(item.project)))
  );
}

/**
 * @param {{ key: string; story?: string; project?: string }[]} baselineItems
 * @param {{ key: string }[]} currentRunItems
 * @param {Set<string> | null} stories
 * @param {Set<string> | null} [captureNames]
 * @param {Set<string> | null} [projects]
 */
export function removedBaselineItems(
  baselineItems,
  currentRunItems,
  stories,
  captureNames = null,
  projects = null,
) {
  const currentKeys = new Set(currentRunItems.map((item) => item.key));
  return baselineItems.filter(
    (item) =>
      comparisonIncludes(item, stories, captureNames, projects) &&
      !currentKeys.has(item.key),
  );
}
