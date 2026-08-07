import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  getCheckoutPaidActivation,
  getStripeFunnelEvents,
} from "@/server/stripe/stripe-funnel-events";

function makeSubscriptionEvent(
  type: Stripe.Event.Type,
  status: Stripe.Subscription.Status,
  options?: {
    metadata?: Record<string, string>;
    previousStatus?: Stripe.Subscription.Status;
    trialEnd?: number | null;
  },
) {
  return {
    type,
    data: {
      object: {
        metadata: options?.metadata ?? {},
        status,
        trial_end: options?.trialEnd ?? null,
      },
      previous_attributes: options?.previousStatus
        ? { status: options.previousStatus }
        : undefined,
    },
  } as Stripe.Event;
}

describe("getStripeFunnelEvents", () => {
  it("waits for completed Checkout before immediate paid activation", () => {
    const event = makeSubscriptionEvent(
      "customer.subscription.created",
      "active",
      {
        metadata: {
          billing_option: "annual",
          import_id: "import-123",
          source: "catalog_importer",
        },
      },
    );

    expect(getStripeFunnelEvents(event)).toEqual([]);
  });

  it("attributes paid activation to Stripe's final hosted choice", () => {
    expect(
      getCheckoutPaidActivation({
        billingOption: "annual",
        session: {
          id: "cs_test",
          metadata: {
            import_id: "import-123",
            source: "catalog_importer",
          },
          subscription: "sub_test",
        } as never,
        subscriptionStatus: "active",
      }),
    ).toEqual({
      event: "paid_activated",
      properties: {
        $insert_id: "stripe:paid_activated:sub_test",
        billing_option: "annual",
        import_id: "import-123",
        source: "catalog_importer",
        trigger: "checkout.session.completed",
        subscription_status: "active",
      },
    });
  });

  it("emits trial_started for new trialing subscriptions", () => {
    const event = makeSubscriptionEvent(
      "customer.subscription.created",
      "trialing",
      { trialEnd: 1735689600 },
    );

    expect(getStripeFunnelEvents(event)).toEqual([
      {
        event: "trial_started",
        properties: {
          source: "stripe-webhook",
          trigger: "customer.subscription.created",
          subscription_status: "trialing",
          trial_end: 1735689600,
        },
      },
    ]);
  });

  it("emits paid_activated when trial converts to active", () => {
    const event = makeSubscriptionEvent(
      "customer.subscription.updated",
      "active",
      { previousStatus: "trialing" },
    );

    expect(getStripeFunnelEvents(event)).toEqual([
      {
        event: "paid_activated",
        properties: {
          source: "stripe-webhook",
          trigger: "trial_to_active",
          subscription_status: "active",
        },
      },
    ]);
  });

  it("emits trial_canceled when a trial moves to a terminal status", () => {
    const event = makeSubscriptionEvent(
      "customer.subscription.updated",
      "canceled",
      { previousStatus: "trialing" },
    );

    expect(getStripeFunnelEvents(event)).toEqual([
      {
        event: "trial_canceled",
        properties: {
          source: "stripe-webhook",
          trigger: "trial_to_terminal_status",
          subscription_status: "canceled",
        },
      },
    ]);
  });
});
