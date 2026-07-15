export const ATLAS_HEALTH_PATH = "/api/runtime-config";

/**
 * @param {{ exitCode?: number | null; pid?: number } | undefined} server
 * @param {{ platform?: NodeJS.Platform; signal?: typeof process.kill }} options
 */
export function terminateAtlasServer(
  server,
  { platform = process.platform, signal = process.kill } = {},
) {
  if (!server?.pid) return false;

  try {
    signal(platform === "win32" ? server.pid : -server.pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}
