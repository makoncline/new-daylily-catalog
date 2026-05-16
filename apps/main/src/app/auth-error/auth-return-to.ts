const DEFAULT_AUTH_RETURN_TO = "/dashboard";

export function getSafeAuthReturnTo(returnTo: string | null): string {
  if (!returnTo) {
    return DEFAULT_AUTH_RETURN_TO;
  }

  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return DEFAULT_AUTH_RETURN_TO;
  }

  try {
    const parsed = new URL(returnTo, "https://daylilycatalog.local");

    if (parsed.origin !== "https://daylilycatalog.local") {
      return DEFAULT_AUTH_RETURN_TO;
    }

    const safePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (safePath === "/auth-error" || safePath.startsWith("/auth-error?")) {
      return DEFAULT_AUTH_RETURN_TO;
    }

    return safePath;
  } catch {
    return DEFAULT_AUTH_RETURN_TO;
  }
}
