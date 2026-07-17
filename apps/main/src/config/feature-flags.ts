import { readFileSync } from "node:fs";

function isVercel() {
  return process.env.VERCEL === "1";
}

function getRuntimeFileFlag(name: string) {
  const path =
    process.env.RUNTIME_FEATURE_FLAGS_PATH ??
    "/data/runtime-feature-flags.json";

  try {
    const flags = JSON.parse(readFileSync(path, "utf8")) as Record<
      string,
      unknown
    >;
    return flags[name] === true;
  } catch {
    return false;
  }
}

export function areGeneratedCultivarImageAssetsEnabledByDefault() {
  return process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS === "true";
}

export function isPublicCultivarSearchEnabled() {
  return getRuntimeFileFlag("publicCultivarSearch") && !isVercel();
}

export function getRuntimeFeatureFlags() {
  return {
    publicCultivarSearch: isPublicCultivarSearchEnabled(),
  };
}
