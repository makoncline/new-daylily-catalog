import { describe, expect, it } from "vitest";
import { getSafeSubscribeSuccessRedirect } from "@/lib/utils/safe-redirect";

describe("getSafeSubscribeSuccessRedirect", () => {
  it("allows local redirect paths", () => {
    expect(getSafeSubscribeSuccessRedirect("/dashboard?tab=billing")).toBe(
      "/dashboard?tab=billing",
    );
  });

  it("allows Stripe billing portal redirects", () => {
    const stripeUrl = "https://billing.stripe.com/p/session/test_123";

    expect(getSafeSubscribeSuccessRedirect(stripeUrl)).toBe(stripeUrl);
  });

  it("rejects protocol-relative and untrusted external redirects", () => {
    expect(getSafeSubscribeSuccessRedirect("//evil.example/path")).toBe(
      "/dashboard",
    );
    expect(getSafeSubscribeSuccessRedirect("https://evil.example/path")).toBe(
      "/dashboard",
    );
    expect(getSafeSubscribeSuccessRedirect("javascript:alert(1)")).toBe(
      "/dashboard",
    );
  });
});
