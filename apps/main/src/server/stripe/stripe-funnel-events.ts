import type Stripe from "stripe";
import type { SubscriptionBillingOption } from "@/config/subscription-config";

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

function getSubscriptionAttribution(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata ?? {};
  return {
    ...(metadata.billing_option
      ? { billing_option: metadata.billing_option }
      : {}),
    ...(metadata.import_id ? { import_id: metadata.import_id } : {}),
    source: metadata.source ?? "stripe-webhook",
  };
}

export function getStripeFunnelEvents(
  event: Stripe.Event,
): StripeFunnelEvent[] {
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
        ...getSubscriptionAttribution(subscription),
        trigger: event.type,
        subscription_status: subscriptionStatus,
        trial_end: subscription.trial_end,
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
        ...getSubscriptionAttribution(subscription),
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
        ...getSubscriptionAttribution(subscription),
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
        ...getSubscriptionAttribution(subscription),
        trigger: event.type,
        subscription_status: subscriptionStatus,
      },
    });
  }

  return funnelEvents;
}

export function getCheckoutPaidActivation({
  billingOption,
  session,
  subscriptionStatus,
}: {
  billingOption: SubscriptionBillingOption;
  session: Stripe.Checkout.Session;
  subscriptionStatus: "none" | Stripe.Subscription.Status | null;
}): StripeFunnelEvent | null {
  if (subscriptionStatus !== "active") {
    return null;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  return {
    event: "paid_activated",
    properties: {
      $insert_id: `stripe:paid_activated:${subscriptionId ?? session.id}`,
      billing_option: billingOption,
      ...(session.metadata?.import_id
        ? { import_id: session.metadata.import_id }
        : {}),
      source: session.metadata?.source ?? "stripe-checkout",
      trigger: "checkout.session.completed",
      subscription_status: subscriptionStatus,
    },
  };
}
