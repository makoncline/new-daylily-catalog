import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/catalog-importer/viewer-state/route";

const state = vi.hoisted(() => ({
  confirmed: true,
  status: "none",
  stripeCustomerId: null as string | null,
  userId: null as string | null,
}));

vi.mock("@/server/clerk/client", () => ({
  getClerk: () =>
    Promise.resolve({
      authenticateRequest: () =>
        Promise.resolve({
          toAuth: () => ({
            isAuthenticated: state.userId !== null,
            userId: state.userId,
          }),
        }),
    }),
}));

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: () =>
        Promise.resolve({ stripeCustomerId: state.stripeCustomerId }),
    },
  },
}));

vi.mock("@/server/stripe/sync-subscription", () => ({
  getStripeSubscriptionResult: () =>
    Promise.resolve({
      confirmed: state.confirmed,
      subscription: { status: state.status },
    }),
}));

describe("catalog importer viewer state", () => {
  const anonymousRequest = () =>
    new Request("http://localhost/api/catalog-importer/viewer-state");
  const signedInRequest = () =>
    new Request("http://localhost/api/catalog-importer/viewer-state", {
      headers: { cookie: "__session=test-session" },
    });

  beforeEach(() => {
    state.confirmed = true;
    state.status = "none";
    state.stripeCustomerId = null;
    state.userId = null;
  });

  it("returns an anonymous, private response without a session", async () => {
    const response = await GET(anonymousRequest());

    expect(await response.json()).toEqual({ viewerState: "anonymous" });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns Pro only for a confirmed active subscription", async () => {
    state.userId = "clerk-user";
    state.stripeCustomerId = "cus_pro";
    state.status = "active";

    const response = await GET(signedInRequest());

    expect(await response.json()).toEqual({ viewerState: "pro" });
  });

  it("keeps checkout available when Stripe cannot confirm the status", async () => {
    state.userId = "clerk-user";
    state.stripeCustomerId = "cus_unconfirmed";
    state.confirmed = false;

    const response = await GET(signedInRequest());

    expect(await response.json()).toEqual({
      viewerState: "signed_in_nonpro",
    });
  });
});
