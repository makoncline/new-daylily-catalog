export const DISABLED_RUNTIME_FEATURE_FLAGS = {
  catalogImporterDiscovery: false,
  imageModerationEnforced: false,
  publicCultivarSearch: false,
};

export type RuntimeFeatureFlags = typeof DISABLED_RUNTIME_FEATURE_FLAGS;
export type RuntimeFeatureName = keyof RuntimeFeatureFlags;

export function parseRuntimeFeatureFlags(value: unknown): RuntimeFeatureFlags {
  const flags =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    catalogImporterDiscovery: flags.catalogImporterDiscovery === true,
    imageModerationEnforced: flags.imageModerationEnforced === true,
    publicCultivarSearch: flags.publicCultivarSearch === true,
  };
}
