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

function getVercelProjectProductionUrl() {
  const productionHost = normalizeHost(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (!productionHost) {
    return null;
  }

  return `https://${productionHost}`;
}

function getConfiguredBaseUrl() {
  const configured = process.env.APP_BASE_URL?.trim();
  if (!configured) {
    return null;
  }

  return configured.replace(/\/$/, "");
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

  const configuredBaseUrl = getConfiguredBaseUrl();
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") {
    const productionUrl = getVercelProjectProductionUrl();
    if (productionUrl) {
      return productionUrl;
    }
  }

  const deploymentHost = normalizeHost(process.env.VERCEL_URL);
  if (deploymentHost) {
    return `https://${deploymentHost}`;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}
