const CULTIVAR_REFERENCE_LINKING_QUERY_PARAM = "cultivarReferenceLinking";

function parseBooleanOverride(value: string | null): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true") {
    return true;
  }
  if (normalized === "0" || normalized === "false") {
    return false;
  }

  return undefined;
}

export function isCultivarReferenceLinkingEnabled(): boolean {
  if (typeof window !== "undefined") {
    const queryValue = new URLSearchParams(window.location.search).get(
      CULTIVAR_REFERENCE_LINKING_QUERY_PARAM,
    );
    const queryOverride = parseBooleanOverride(queryValue);
    if (queryOverride !== undefined) {
      return queryOverride;
    }
  }

  return process.env.NEXT_PUBLIC_CULTIVAR_REFERENCE_LINKING_ENABLED === "true";
}

