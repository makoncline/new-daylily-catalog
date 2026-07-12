const stories = new Set([
  "public",
  "onboarding",
  "dashboard-base",
  "dashboard-interactions",
]);

/** @param {string[]} argv */
export function parseAgentLoopArgs(argv) {
  /** @type {{ full: boolean; story: string | null; uiOnly: boolean; keepServer: boolean; build: boolean }} */
  const options = {
    full: false,
    story: null,
    uiOnly: false,
    keepServer: false,
    build: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    else if (argument === "--full") options.full = true;
    else if (argument === "--ui-only") options.uiOnly = true;
    else if (argument === "--keep-server") options.keepServer = true;
    else if (argument === "--build") options.build = true;
    else if (argument === "--story") options.story = argv[++index] ?? null;
    else throw new Error(`Unknown agent loop option: ${argument}`);
  }
  if (options.full && options.story)
    throw new Error("Choose either --full or --story, not both.");
  if (options.story && !stories.has(options.story)) {
    throw new Error(
      `Unknown atlas story: ${options.story}. Choose ${[...stories].join(", ")}.`,
    );
  }
  return options;
}

/** @param {ReturnType<typeof parseAgentLoopArgs>} options */
export function buildAgentLoopPlan(options) {
  const plan = options.full
    ? [
        ["node", ["scripts/run-agent-atlas-full.mjs"]],
        ["node", ["scripts/agent-atlas-compare.mjs"]],
      ]
    : options.story
      ? [["node", ["scripts/run-agent-atlas-story.mjs", options.story]]]
      : [["node", ["scripts/run-agent-atlas-changed.mjs"]]];
  if (!options.uiOnly) {
    plan.push([
      "pnpm",
      [
        "exec",
        "concurrently",
        "--kill-others-on-fail",
        "--names",
        "tests,typecheck,lint",
        "node scripts/agent-related-tests.mjs",
        "pnpm typecheck",
        "pnpm lint",
      ],
    ]);
  }
  if (options.build) plan.push(["node", ["scripts/run-agent-local-build.mjs"]]);
  return plan;
}

/** @param {number} milliseconds */
export function formatDuration(milliseconds) {
  return milliseconds < 1_000
    ? `${milliseconds}ms`
    : `${(milliseconds / 1_000).toFixed(1)}s`;
}

/** @param {string} baseURL @param {string} databaseId */
export function getAgentLoopServerConfig(baseURL, databaseId) {
  const url = new URL(baseURL);
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  ) {
    throw new Error("AGENT_ATLAS_BASE_URL must be a local HTTP URL.");
  }
  return {
    port: url.port || "80",
    databaseId,
  };
}

/** @param {unknown} payload @param {string} databaseId */
export function isExpectedAgentLoopRuntime(payload, databaseId) {
  if (!payload || typeof payload !== "object") return false;
  const runtime =
    /** @type {{ localDataRuntime?: { mode?: unknown; databaseId?: unknown } }} */ (
      payload
    ).localDataRuntime;
  return (
    runtime?.mode === "realistic-data" && runtime.databaseId === databaseId
  );
}
