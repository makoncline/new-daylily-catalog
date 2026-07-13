import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";
import path from "node:path";
import {
  hasCompletedCheckout,
  integrationStripeHandlers,
  resetIntegrationStripeState,
} from "../scripts/integration-stripe-handlers.mjs";
import { setupServer } from "msw/node";

const server = setupServer(...integrationStripeHandlers);
const statePath = path.join(
  process.cwd(),
  "tests/.tmp/integration-stripe-state.sqlite",
);

describe("integration Stripe scenario state", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = `file:${statePath}`;
    resetIntegrationStripeState();
  });

  afterAll(() => rmSync(statePath, { force: true }));

  it("does not activate a subscription until checkout is completed", async () => {
    process.env.APP_BASE_URL = "http://localhost:3210";
    process.env.STRIPE_PRICE_ID = "price_hermetic";
    server.listen({ onUnhandledRequest: "error" });

    try {
      const body = new URLSearchParams({
        customer: "cus_hermetic_test",
        mode: "subscription",
        "line_items[0][price]": "price_hermetic",
        "line_items[0][quantity]": "1",
        success_url: "http://localhost:3210/subscribe/success",
        cancel_url: "http://localhost:3210/dashboard",
        "subscription_data[trial_period_days]": "7",
      });
      const response = await fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        { method: "POST", body },
      );
      const session = (await response.json()) as { id: string };

      expect(hasCompletedCheckout("cus_hermetic_test")).toBe(false);
      const completionUrl = `https://api.stripe.com/v1/test_helpers/checkout/sessions/${session.id}/complete`;
      expect((await fetch(completionUrl, { method: "POST" })).ok).toBe(true);
      expect(hasCompletedCheckout("cus_hermetic_test")).toBe(true);
      expect((await fetch(completionUrl, { method: "POST" })).status).toBe(400);

      const reset = (
        globalThis as typeof globalThis & {
          __daylilyResetIntegrationStripeState?: () => void;
        }
      ).__daylilyResetIntegrationStripeState;
      reset?.();
      expect(hasCompletedCheckout("cus_hermetic_test")).toBe(false);
    } finally {
      server.close();
    }
  });
});
