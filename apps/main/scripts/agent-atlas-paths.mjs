import path from "node:path";

export const REALISTIC_ATLAS_RUNTIME = "realistic-data";
export const HERMETIC_ATLAS_RUNTIME = "hermetic";

/** @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env] */
export function getAtlasRuntime(env = process.env) {
  const runtime =
    env.AGENT_ATLAS_RUNTIME ??
    (env.HERMETIC_MODE === "1"
      ? HERMETIC_ATLAS_RUNTIME
      : REALISTIC_ATLAS_RUNTIME);
  if (![REALISTIC_ATLAS_RUNTIME, HERMETIC_ATLAS_RUNTIME].includes(runtime)) {
    throw new Error(`Unknown Atlas runtime: ${runtime}`);
  }
  return runtime;
}

/** @param {string} appRoot @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env] */
export function getAtlasRoot(appRoot, env = process.env) {
  const root = path.join(appRoot, "local", "agent-atlas");
  const runtime = getAtlasRuntime(env);
  return runtime === REALISTIC_ATLAS_RUNTIME
    ? root
    : path.join(root, "runtimes", runtime);
}
