import type { APIRequestContext } from "@playwright/test";

/** Set an origin-scoped cookie without sending the bypass secret to Clerk. */
export async function preparePreviewAccess(
  request: APIRequestContext,
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

  // This request shares the browser context's cookie jar. Do not follow the
  // response redirect: request headers would otherwise follow it to Clerk.
  // Vercel sets the bypass cookie on its initial redirect response.
  const response = await request
    .get(`${target.origin}/`, {
      headers: {
        "x-vercel-protection-bypass": secret,
        "x-vercel-set-bypass-cookie": "true",
      },
      maxRedirects: 0,
    })
    .catch(() => {
      // Playwright network errors can include request headers in their call log.
      throw new Error("Preview access request failed before Clerk loaded.");
    });
  try {
    if (response.status() >= 400) {
      throw new Error(
        `Preview access failed before Clerk loaded (HTTP ${response.status()}).`,
      );
    }
  } finally {
    await response.dispose();
  }
}
