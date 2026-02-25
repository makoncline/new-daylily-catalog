import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CACHE_CONFIG } from "@/config/cache-config";
import { env } from "@/env";
import { stripe } from "@/server/stripe/client";
import type Stripe from "stripe";
import { syncStripeSubscriptionToKV } from "@/server/stripe/sync-subscription";

const relevantEvents = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      const customerId = getCustomerIdFromEvent(event);
      if (customerId) {
        await syncStripeSubscriptionToKV(customerId);
        revalidateTag(CACHE_CONFIG.TAGS.PUBLIC_PRO_USER_IDS, "max");
      }
    } catch (error) {
      console.error("Error processing webhook:", error);
      return NextResponse.json(
        { error: "Webhook processing failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}

function getCustomerIdFromEvent(event: Stripe.Event): string | null {
  const object = event.data.object as { customer?: string | Stripe.Customer };

  if (!object.customer) {
    console.error("No customer found in event", event.type);
    return null;
  }

  return typeof object.customer === "string"
    ? object.customer
    : object.customer.id;
}
