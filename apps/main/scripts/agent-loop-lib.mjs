const stories = new Set([
  "public",
  "onboarding",
  "dashboard-base",
  "dashboard-interactions",
]);

/** @param {string[]} argv */
export function parseAgentLoopArgs(argv) {
  /** @type {{ full: boolean; story: string | null; flow: string | null; uiOnly: boolean; keepServer: boolean; build: boolean; e2e: boolean; realisticData: boolean }} */
  const options = {
    full: false,
    story: null,
    flow: null,
    uiOnly: false,
    keepServer: false,
    build: false,
    e2e: false,
    realisticData: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    else if (argument === "--full") options.full = true;
    else if (argument === "--ui-only") options.uiOnly = true;
    else if (argument === "--keep-server") options.keepServer = true;
    else if (argument === "--build") options.build = true;
    else if (argument === "--e2e") options.e2e = true;
    else if (argument === "--realistic-data") options.realisticData = true;
    else if (argument === "--story") options.story = argv[++index] ?? null;
    else if (argument === "--flow") options.flow = argv[++index] ?? null;
    else throw new Error(`Unknown agent loop option: ${argument}`);
  }
  if (options.full && options.story)
    throw new Error("Choose either --full or --story, not both.");
  if (
    [options.full, Boolean(options.story), Boolean(options.flow)].filter(
      Boolean,
    ).length > 1
  )
    throw new Error(
      "Choose only one Atlas selection: --full, --story, or --flow.",
    );
  if (options.story && !stories.has(options.story)) {
    throw new Error(
      `Unknown atlas story: ${options.story}. Choose ${[...stories].join(", ")}.`,
    );
  }
  if (options.uiOnly && options.e2e)
    throw new Error("--e2e cannot be combined with --ui-only.");
  if (options.keepServer && !options.uiOnly)
    throw new Error("--keep-server requires --ui-only.");
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
      : options.flow
        ? [["node", ["scripts/run-agent-atlas-flow.mjs", options.flow]]]
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
        "pnpm exec vitest run --silent=passed-only",
        "pnpm typecheck",
        "pnpm lint",
      ],
    ]);
    plan.push([
      "pnpm",
      ["exec", "playwright", "test", "-c", "playwright.integration.config.ts"],
    ]);
  }
  if (options.e2e) plan.push(["pnpm", ["test:e2e"]]);
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
  if (url.protocol !== "http:" || url.hostname !== "localhost") {
    throw new Error(
      "AGENT_ATLAS_BASE_URL must use http://localhost so the app, redirects, and health checks share one origin.",
    );
  }
  return {
    port: url.port || "80",
    databaseId,
  };
}

/** @param {unknown} payload @param {{ mode: "hermetic" | "realistic-data"; databaseId: string }} expected */
export function isExpectedAgentLoopRuntime(payload, expected) {
  if (!payload || typeof payload !== "object") return false;
  const runtime =
    /** @type {{ localDataRuntime?: { mode?: unknown; databaseId?: unknown } }} */ (
      payload
    ).localDataRuntime;
  return (
    runtime?.mode === expected.mode &&
    runtime.databaseId === expected.databaseId
  );
}
