export const ATLAS_STORIES = {
  public: {
    grep:
      "catalog directory|public catalog|representative public listing|signed-out onboarding|home-page|start-membership|support-page|privacy-page|terms-page|sign-in-page|catalog search results",
  },
  onboarding: { grep: "onboarding" },
  "dashboard-base": { grep: "dashboard states" },
  "dashboard-interactions": { grep: "dashboard interaction states" },
};

const storyOrder = Object.keys(ATLAS_STORIES);

/** @param {string} file */
function storiesForFile(file) {
  const normalized = file.replaceAll("\\", "/");

  if (
    normalized.includes("/components/") ||
    normalized.includes("/styles/") ||
    normalized.endsWith("globals.css") ||
    normalized.includes("tests/agent-atlas") ||
    normalized.includes("playwright.agent-atlas")
  ) {
    return ["all"];
  }
  if (normalized.includes("/app/onboarding/")) return ["onboarding"];
  if (normalized.includes("/app/dashboard/listings/")) {
    return ["dashboard-base", "dashboard-interactions"];
  }
  if (
    normalized.includes("/app/dashboard/lists/") ||
    normalized.includes("/app/dashboard/tags/")
  ) {
    return ["dashboard-base", "dashboard-interactions"];
  }
  if (normalized.includes("/app/dashboard/")) return ["dashboard-base"];
  if (
    normalized.includes("/app/(public)/") ||
    normalized.includes("/app/start-membership/") ||
    normalized.includes("/app/sign-in/")
  ) {
    return ["public"];
  }
  if (!normalized.includes("apps/main/src/")) return [];
  return ["all"];
}

/** @param {string[]} files */
export function selectAtlasStories(files) {
  const selected = new Set();
  for (const file of files) {
    for (const story of storiesForFile(file)) selected.add(story);
  }
  if (selected.has("all")) return ["all"];
  return storyOrder.filter((story) => selected.has(story));
}

/** @param {string[]} stories */
export function grepForStories(stories) {
  if (stories.length === 0 || stories.includes("all")) return null;
  return stories
    .map((story) => ATLAS_STORIES[/** @type {keyof typeof ATLAS_STORIES} */ (story)].grep)
    .join("|");
}
