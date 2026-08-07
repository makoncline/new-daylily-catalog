// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureEvent: vi.fn(),
  constructEvent: vi.fn(),
  findUser: vi.fn(),
  finalizeCheckout: vi.fn(),
  funnelEvents: vi.fn(),
  paidActivation: vi.fn(),
  syncSubscription: vi.fn(),
}));

vi.mock("@/env", () => ({
  env: { STRIPE_WEBHOOK_SECRET: "stripe_webhook_secret" },
  requireEnv: (_name: string, value: string) => value,
}));

vi.mock("@/server/stripe/client", () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
  }),
}));

vi.mock("@/server/stripe/sync-subscription", () => ({
  syncStripeSubscriptionToKV: mocks.syncSubscription,
}));

vi.mock("@/server/db", () => ({
  db: { user: { findUnique: mocks.findUser } },
}));

vi.mock("@/server/analytics/posthog-server", () => ({
  captureServerPosthogEvent: mocks.captureEvent,
}));

vi.mock("@/server/stripe/stripe-funnel-events", () => ({
  getCheckoutPaidActivation: mocks.paidActivation,
  getStripeFunnelEvents: mocks.funnelEvents,
}));

vi.mock("@/server/stripe/membership-checkout-price", () => ({
  finalizeMembershipCheckoutSession: mocks.finalizeCheckout,
}));

function request(signature = "sig_test") {
  return new Request("https://daylilycatalog.com/api/stripe-webhook", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : undefined,
    body: JSON.stringify({ id: "evt_test" }),
  });
}

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUser.mockResolvedValue({ clerkUserId: "user_test" });
    mocks.finalizeCheckout.mockResolvedValue(null);
    mocks.funnelEvents.mockReturnValue([]);
    mocks.paidActivation.mockReturnValue(null);
    mocks.syncSubscription.mockResolvedValue({ status: "active" });
  });

  it("rejects requests without a Stripe signature", async () => {
    const { POST } = await import("@/app/api/stripe-webhook/route");

    const response = await POST(request(""));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing stripe-signature header",
    });
    expect(mocks.constructEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid Stripe signature", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    const { POST } = await import("@/app/api/stripe-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid signature",
    });
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it("syncs relevant customer events and records funnel events", async () => {
    const event = {
      type: "customer.subscription.created",
      data: {
        object: {
          customer: "cus_test",
          metadata: {
            import_id: "import-test",
            entry_source: "catalog_importer",
          },
        },
      },
    };
    mocks.constructEvent.mockReturnValue(event);
    mocks.funnelEvents.mockReturnValue([
      { event: "trial_started", properties: { trigger: event.type } },
    ]);
    const { POST } = await import("@/app/api/stripe-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(mocks.syncSubscription).toHaveBeenCalledWith("cus_test");
    expect(mocks.findUser).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_test" },
      select: { clerkUserId: true },
    });
    expect(mocks.captureEvent).toHaveBeenCalledWith({
      distinctId: "user_test",
      event: "trial_started",
      properties: {
        trigger: event.type,
        source_page: "/api/stripe-webhook",
        stripe_customer_id: "cus_test",
        synced_subscription_status: "active",
        import_id: "import-test",
        entry_source: "catalog_importer",
      },
    });
  });

  it("records the final Stripe-hosted billing choice", async () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          customer: "cus_test",
          metadata: { source: "dashboard" },
          subscription: "sub_test",
        },
      },
    };
    mocks.constructEvent.mockReturnValue(event);
    mocks.finalizeCheckout.mockResolvedValue("annual");
    mocks.paidActivation.mockReturnValue({
      event: "paid_activated",
      properties: { billing_option: "annual" },
    });
    const { POST } = await import("@/app/api/stripe-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.finalizeCheckout).toHaveBeenCalledWith(event.data.object);
    expect(mocks.paidActivation).toHaveBeenCalledWith({
      billingOption: "annual",
      session: event.data.object,
      subscriptionStatus: "active",
    });
    expect(mocks.captureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "paid_activated",
        properties: expect.objectContaining({ billing_option: "annual" }),
      }),
    );
  });

  it("acknowledges relevant events without a customer id", async () => {
    // Some tracked event objects have nullable customers:
    // https://docs.stripe.com/api/payment_intents/object
    mocks.constructEvent.mockReturnValue({
      type: "invoice.paid",
      data: { object: {} },
    });
    const { POST } = await import("@/app/api/stripe-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it("returns 500 when subscription synchronization fails", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "invoice.paid",
      data: { object: { customer: "cus_test" } },
    });
    mocks.syncSubscription.mockRejectedValue(new Error("Stripe unavailable"));
    const { POST } = await import("@/app/api/stripe-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook processing failed",
    });
  });

  it("acknowledges irrelevant events without synchronizing", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.created",
      data: { object: { customer: "cus_test" } },
    });
    const { POST } = await import("@/app/api/stripe-webhook/route");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });
});
