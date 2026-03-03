import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { getStripeFunnelEvents } from "@/server/stripe/stripe-funnel-events";

function makeSubscriptionEvent(
  type: Stripe.Event.Type,
  status: Stripe.Subscription.Status,
  options?: {
    previousStatus?: Stripe.Subscription.Status;
    trialEnd?: number | null;
  },
) {
  return {
    type,
    data: {
      object: {
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
