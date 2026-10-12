import type { BrowserContext } from "@playwright/test";

/** Set an origin-scoped cookie without sending the bypass secret to Clerk. */
export async function preparePreviewAccess(
  context: BrowserContext,
  baseURL: string | undefined,
  secret: string | undefined,
) {
  if (!baseURL || !secret) return;
  const target = new URL(baseURL);
  if (["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) return;
  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    !target.hostname.endsWith(".vercel.app")
  ) {
    throw new Error("Preview bypass requires a trusted HTTPS preview origin.");
  }

  // Native fetch keeps the secret out of Playwright's API-step error reports.
  // Never follow redirects: the secret must stay on this origin.
  const response = await fetch(`${target.origin}/`, {
    headers: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  }).catch(() => {
    throw new Error("Preview access request failed before Clerk loaded.");
  });
  try {
    if (response.status >= 400) {
      throw new Error(
        `Preview access failed before Clerk loaded (HTTP ${response.status}).`,
      );
    }
    const cookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith("_vercel_jwt="));
    // Unprotected previews do not need or necessarily return a bypass cookie.
    if (!cookie) return;
    await context.addCookies([
      {
        name: "_vercel_jwt",
        value: cookie.split(";", 1)[0]!.slice("_vercel_jwt=".length),
        url: `${target.origin}/`,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ]);
  } finally {
    await response.body?.cancel();
  }
}
