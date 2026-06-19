export function isV2CultivarDisplayDataEnabled() {
  return process.env.NEXT_PUBLIC_USE_V2_CULTIVAR_DISPLAY_DATA === "true";
}

export function areGeneratedCultivarImageAssetsEnabledByDefault() {
  return process.env.USE_GENERATED_CULTIVAR_IMAGE_ASSETS === "true";
}
