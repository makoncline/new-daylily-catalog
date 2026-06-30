export function areGeneratedCultivarImageAssetsEnabledByDefault() {
  return process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS === "true";
}
