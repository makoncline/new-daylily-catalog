import { readFileSync } from "node:fs";
import {
  DISABLED_RUNTIME_FEATURE_FLAGS,
  parseRuntimeFeatureFlags,
  type RuntimeFeatureFlags,
} from "@/config/runtime-feature-flags";

function isVercel() {
  return process.env.VERCEL === "1";
}

function readConfiguredRuntimeFeatureFlags(): RuntimeFeatureFlags {
  const path =
    process.env.RUNTIME_FEATURE_FLAGS_PATH ??
    "/data/runtime-feature-flags.json";

  try {
    return parseRuntimeFeatureFlags(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return DISABLED_RUNTIME_FEATURE_FLAGS;
  }
}

export function isPublicCultivarSearchEnabled() {
  return getRuntimeFeatureFlags().publicCultivarSearch;
}

export function isCatalogImporterDiscoveryEnabled() {
  return getRuntimeFeatureFlags().catalogImporterDiscovery;
}

export function isImageModerationEnforced() {
  return getRuntimeFeatureFlags().imageModerationEnforced;
}

export function getRuntimeFeatureFlags(): RuntimeFeatureFlags {
  const configured = readConfiguredRuntimeFeatureFlags();

  return {
    catalogImporterDiscovery: configured.catalogImporterDiscovery,
    imageModerationEnforced: configured.imageModerationEnforced,
    publicCultivarSearch: configured.publicCultivarSearch && !isVercel(),
  };
}
