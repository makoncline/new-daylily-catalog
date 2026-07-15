export function areGeneratedCultivarImageAssetsEnabledByDefault() {
  return process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS === "true";
}

export function isPublicCultivarSearchEnabled() {
  return process.env.PUBLIC_CULTIVAR_SEARCH_ENABLED === "true";
}
