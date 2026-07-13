export const ATLAS_STORIES = {
  public: { projectGroup: "anonymous" },
  onboarding: { projectGroup: "anonymous-desktop" },
  "dashboard-base": { projectGroup: "member" },
  "dashboard-interactions": { projectGroup: "member" },
};

const storyOrder = Object.keys(ATLAS_STORIES);

/** @param {string} file */
function storiesForFile(file) {
  const normalized = file.replaceAll("\\", "/");

  if (
    normalized.includes("/components/public-catalog-search/") ||
    normalized.includes("/components/data-table/")
  ) {
    return ["public", "dashboard-base", "dashboard-interactions"];
  }
  if (
    normalized.includes("/components/forms/") ||
    /\/components\/(ahs-listing-(display|select)|currency-input|delete-confirm-dialog|image-manager|image-upload|multi-list-select|slug-change-confirm-dialog)\.tsx$/.test(
      normalized,
    )
  ) {
    return ["dashboard-base", "dashboard-interactions"];
  }
  if (
    /\/components\/(app-sidebar|auth-handler|dashboard-providers|nav-main|nav-secondary|nav-user|posthog-user-identification|stripe-portal-button|webmcp-provider)\.tsx$/.test(
      normalized,
    )
  ) {
    return ["dashboard-base"];
  }
  if (
    /\/components\/(public-footer|public-nav|public-shell)\.tsx$/.test(
      normalized,
    )
  ) {
    return ["public", "onboarding"];
  }

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

/** @param {string[]} stories @param {string[]} runtimeProjects */
export function projectsForStories(stories, runtimeProjects) {
  if (stories.includes("all")) return runtimeProjects;
  const groups = new Set(
    stories.map(
      (story) =>
        ATLAS_STORIES[/** @type {keyof typeof ATLAS_STORIES} */ (story)]
          .projectGroup,
    ),
  );
  return runtimeProjects.filter((project) => {
    if (groups.has("anonymous") && project.startsWith("anonymous-"))
      return true;
    if (groups.has("anonymous-desktop") && project === "anonymous-desktop")
      return true;
    return groups.has("member") && !project.startsWith("anonymous-");
  });
}
