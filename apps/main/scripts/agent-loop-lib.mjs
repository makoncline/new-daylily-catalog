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
        ["pnpm", ["agent:capture"]],
        ["pnpm", ["agent:compare"]],
      ]
    : options.story
      ? [["pnpm", ["agent:capture:story", "--", options.story]]]
      : [["pnpm", ["agent:capture:changed"]]];
  if (!options.uiOnly) plan.push(["pnpm", ["agent:checks"]]);
  if (options.build) plan.push(["pnpm", ["agent:build"]]);
  return plan;
}

/** @param {number} milliseconds */
export function formatDuration(milliseconds) {
  return milliseconds < 1_000
    ? `${milliseconds}ms`
    : `${(milliseconds / 1_000).toFixed(1)}s`;
}
