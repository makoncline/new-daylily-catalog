function getForwardedValue(value: string | null | undefined) {
  return value?.split(",")[0]?.trim() ?? null;
}

function normalizeHost(rawHost: string | null | undefined) {
  const host = getForwardedValue(rawHost);
  return host ? host.replace(/^https?:\/\//, "") : null;
}

function inferProtocol(host: string, rawProtocol: string | null | undefined) {
  const protocol = getForwardedValue(rawProtocol);
  if (protocol === "http" || protocol === "https") {
    return protocol;
  }

  const isLocalHost =
    host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return isLocalHost ? "http" : "https";
}

export function getBaseUrl(requestHeaders?: Headers | null) {
  if (typeof window !== "undefined") return window.location.origin;

  const host = normalizeHost(
    requestHeaders?.get("x-forwarded-host") ?? requestHeaders?.get("host"),
  );
  if (host) {
    const protocol = inferProtocol(host, requestHeaders?.get("x-forwarded-proto"));
    return `${protocol}://${host}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}
