const SUBSCRIBE_SUCCESS_EXTERNAL_REDIRECT_HOSTS = new Set([
  "billing.stripe.com",
]);

export const SUBSCRIPTION_SYNCED_PARAM = "subscriptionSynced";

export function getSafeSubscribeSuccessRedirect(
  redirectValue: string | undefined,
) {
  if (!redirectValue) {
    return "/dashboard";
  }

  if (redirectValue.startsWith("/") && !redirectValue.startsWith("//")) {
    try {
      const parsed = new URL(redirectValue, "https://daylilycatalog.local");
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return "/dashboard";
    }
  }

  try {
    const parsed = new URL(redirectValue);
    if (
      parsed.protocol === "https:" &&
      SUBSCRIBE_SUCCESS_EXTERNAL_REDIRECT_HOSTS.has(parsed.hostname)
    ) {
      return parsed.toString();
    }
  } catch {
    return "/dashboard";
  }

  return "/dashboard";
}

export function withSubscribeSuccessSyncedParam(redirectValue: string) {
  if (!redirectValue.startsWith("/") || redirectValue.startsWith("//")) {
    return redirectValue;
  }

  const parsed = new URL(redirectValue, "https://daylilycatalog.local");
  parsed.searchParams.set(SUBSCRIPTION_SYNCED_PARAM, "1");
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
