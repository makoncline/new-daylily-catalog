import fs from "node:fs";
import path from "node:path";

/** @type {Record<1 | 2 | 3, string[]>} */
export const e2eCiGroups = {
  1: [
    "tests/e2e/catalog-importer.e2e.ts",
    "tests/e2e/listing-image-manager.e2e.ts",
    "tests/e2e/manual-signin.e2e.ts",
    "tests/e2e/public-profile-first-response.e2e.ts",
    "tests/e2e/webmcp-discovery.e2e.ts",
  ],
  2: [
    "tests/e2e/create-edit-listing-flow.e2e.ts",
    "tests/e2e/manage-list-page-features.e2e.ts",
    "tests/e2e/cultivar-page-flow.e2e.ts",
    "tests/e2e/dashboard-listings-search-touch.e2e.ts",
    "tests/e2e/public-catalog-advanced-search.e2e.ts",
  ],
  3: [
    "tests/e2e/new-user-journey.e2e.ts",
    "tests/e2e/listings-page-features.e2e.ts",
    "tests/e2e/onboarding-full-flow.e2e.ts",
    "tests/e2e/lists-page-features.e2e.ts",
    "tests/e2e/signed-in-user-tour.e2e.ts",
  ],
};

const defaultAppRoot = path.resolve(import.meta.dirname, "..");

/** @param {string | number} value */
export function getE2eCiGroup(value) {
  const group = Number(value);
  if (!Number.isInteger(group) || ![1, 2, 3].includes(group)) {
    throw new Error(`Expected E2E CI group 1, 2, or 3. Got: ${value}`);
  }
  return /** @type {1 | 2 | 3} */ (group);
}

/** @param {string} [appRoot] */
export function discoverLocalE2eFiles(appRoot = defaultAppRoot) {
  const directory = path.join(appRoot, "tests/e2e");
  /**
   * @param {string} currentDirectory
   * @returns {string[]}
   */
  function discover(currentDirectory) {
    return fs
      .readdirSync(currentDirectory, { withFileTypes: true })
      .flatMap((entry) => {
        const absolutePath = path.join(currentDirectory, entry.name);
        if (entry.isDirectory()) return discover(absolutePath);
        if (!entry.name.match(/\.e2e\.(?:ts|tsx)$/)) return [];

        const source = fs.readFileSync(absolutePath, "utf8");
        const isAttachOnly =
          !source.includes("@local") &&
          ["@preview", "@profile", "@prod"].some((tag) => source.includes(tag));
        if (isAttachOnly) return [];

        return [path.relative(appRoot, absolutePath).split(path.sep).join("/")];
      });
  }

  return discover(directory).sort();
}

/**
 * @param {{ appRoot?: string, groups?: Record<number, string[]> }} [options]
 */
export function validateE2eCiGroups({
  appRoot = defaultAppRoot,
  groups = e2eCiGroups,
} = {}) {
  const assigned = Object.values(groups).flat();
  const discovered = discoverLocalE2eFiles(appRoot);
  const duplicates = [
    ...new Set(
      assigned.filter((file, index) => assigned.indexOf(file) !== index),
    ),
  ];
  const missing = discovered.filter((file) => !assigned.includes(file));
  const unknown = assigned.filter((file) => !discovered.includes(file));
  if (duplicates.length || missing.length || unknown.length) {
    throw new Error(
      `Invalid E2E CI groups: ${JSON.stringify({ duplicates, missing, unknown })}`,
    );
  }
  return { assigned: [...assigned].sort(), discovered };
}
