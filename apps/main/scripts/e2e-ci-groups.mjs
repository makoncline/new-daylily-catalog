import fs from "node:fs";
import path from "node:path";

export const e2eCiGroups = {
  1: [
    "tests/e2e/create-edit-listing-flow.e2e.ts",
    "tests/e2e/manage-list-page-features.e2e.ts",
    "tests/e2e/listing-image-manager.e2e.ts",
    "tests/e2e/public-profile-first-response.e2e.ts",
  ],
  2: [
    "tests/e2e/new-user-journey.e2e.ts",
    "tests/e2e/listings-page-features.e2e.ts",
    "tests/e2e/signed-in-user-tour.e2e.ts",
    "tests/e2e/manual-signin.e2e.ts",
    "tests/e2e/webmcp-discovery.e2e.ts",
  ],
  3: [
    "tests/e2e/lists-page-features.e2e.ts",
    "tests/e2e/onboarding-full-flow.e2e.ts",
    "tests/e2e/cultivar-page-flow.e2e.ts",
    "tests/e2e/public-catalog-advanced-search.e2e.ts",
    "tests/e2e/dashboard-listings-search-touch.e2e.ts",
  ],
};

export function discoverLocalE2eFiles(appRoot = process.cwd()) {
  const e2eDir = path.join(appRoot, "tests", "e2e");
  return fs
    .readdirSync(e2eDir)
    .filter((file) => file.endsWith(".e2e.ts"))
    .filter((file) =>
      fs.readFileSync(path.join(e2eDir, file), "utf8").includes("@local"),
    )
    .map((file) => `tests/e2e/${file}`)
    .sort();
}

export function validateE2eCiGroups(appRoot = process.cwd()) {
  const assigned = Object.values(e2eCiGroups).flat();
  const duplicates = assigned.filter(
    (file, index) => assigned.indexOf(file) !== index,
  );
  const discovered = discoverLocalE2eFiles(appRoot);
  const missing = discovered.filter((file) => !assigned.includes(file));
  const unknown = assigned.filter((file) => !discovered.includes(file));

  if (duplicates.length || missing.length || unknown.length) {
    throw new Error(
      `Invalid E2E CI groups: ${JSON.stringify({ duplicates, missing, unknown })}`,
    );
  }

  return { assigned, discovered };
}
