import type Stripe from "stripe";

type StripeFunnelEventName =
  | "trial_started"
  | "paid_activated"
  | "trial_canceled";

interface StripeFunnelEvent {
  event: StripeFunnelEventName;
  properties: Record<string, boolean | null | number | string | undefined>;
}

const TERMINAL_TRIAL_STATUSES = new Set<Stripe.Subscription.Status>([
  "canceled",
  "incomplete_expired",
  "unpaid",
]);

function getPreviousSubscriptionStatus(event: Stripe.Event) {
  if (event.type !== "customer.subscription.updated") {
    return null;
  }

  const eventData = event.data as { previous_attributes?: { status?: string } };
  return eventData.previous_attributes?.status ?? null;
}

export function getStripeFunnelEvents(event: Stripe.Event): StripeFunnelEvent[] {
  const funnelEvents: StripeFunnelEvent[] = [];

  if (
    event.type !== "customer.subscription.created" &&
    event.type !== "customer.subscription.updated" &&
    event.type !== "customer.subscription.deleted"
  ) {
    return funnelEvents;
  }

  const subscription = event.data.object;
  const previousStatus = getPreviousSubscriptionStatus(event);
  const subscriptionStatus = subscription.status;

  if (
    event.type === "customer.subscription.created" &&
    subscriptionStatus === "trialing"
  ) {
    funnelEvents.push({
      event: "trial_started",
      properties: {
        source: "stripe-webhook",
        trigger: event.type,
        subscription_status: subscriptionStatus,
        trial_end: subscription.trial_end,
      },
    });
  }

  if (
    event.type === "customer.subscription.created" &&
    subscriptionStatus === "active"
  ) {
    funnelEvents.push({
      event: "paid_activated",
      properties: {
        source: "stripe-webhook",
        trigger: event.type,
        subscription_status: subscriptionStatus,
      },
    });
  }

  if (
    event.type === "customer.subscription.updated" &&
    previousStatus === "trialing" &&
    subscriptionStatus === "active"
  ) {
    funnelEvents.push({
      event: "paid_activated",
      properties: {
        source: "stripe-webhook",
        trigger: "trial_to_active",
        subscription_status: subscriptionStatus,
      },
    });
  }

  if (
    event.type === "customer.subscription.updated" &&
    previousStatus === "trialing" &&
    TERMINAL_TRIAL_STATUSES.has(subscriptionStatus)
  ) {
    funnelEvents.push({
      event: "trial_canceled",
      properties: {
        source: "stripe-webhook",
        trigger: "trial_to_terminal_status",
        subscription_status: subscriptionStatus,
      },
    });
  }

  if (
    event.type === "customer.subscription.deleted" &&
    Boolean(subscription.trial_end)
  ) {
    funnelEvents.push({
      event: "trial_canceled",
      properties: {
        source: "stripe-webhook",
        trigger: event.type,
        subscription_status: subscriptionStatus,
      },
    });
  }

  return funnelEvents;
}
