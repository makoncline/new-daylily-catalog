import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { env } from "@/env";
import { db } from "@/server/db";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

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

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "customer.subscription.trial_will_end":
        await handleSubscriptionTrialWillEnd(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;

  if (!userId) {
    console.error("Missing userId in session metadata");
    return;
  }

  await db.stripeCustomer.upsert({
    where: { id: customerId },
    update: {
      email: session.customer_details!.email!,
      name: session.customer_details!.name!,
    },
    create: {
      id: customerId,
      userId: userId,
      email: session.customer_details!.email!,
      name: session.customer_details!.name!,
    },
  });

  console.log(`Checkout completed for user ${userId}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  await handleSubscriptionChange(subscription);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await handleSubscriptionChange(subscription);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  const customer = await db.stripeCustomer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    console.error(`No customer found for ID ${customerId}`);
    return;
  }

  await db.stripeSubscription.upsert({
    where: { id: subscriptionId },
    update: {
      status: subscription.status,
      priceId: subscription.items.data[0]!.price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    create: {
      id: subscriptionId,
      userId: customer.userId,
      stripeCustomerId: customerId,
      status: subscription.status,
      priceId: subscription.items.data[0]!.price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(
    `Subscription ${subscriptionId} created/updated for user ${customer.userId}`,
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  await db.stripeSubscription.delete({
    where: { id: subscriptionId },
  });

  console.log(`Subscription ${subscriptionId} deleted`);
}

async function handleSubscriptionTrialWillEnd(
  subscription: Stripe.Subscription,
) {
  const subscriptionId = subscription.id;

  if (subscription.trial_end === null) {
    console.log(
      `Unexpected: Trial end event received for subscription ${subscriptionId} without a trial_end date`,
    );
    return;
  }

  const trialEnd = new Date(subscription.trial_end * 1000);

  await db.stripeSubscription.update({
    where: { id: subscriptionId },
    data: { currentPeriodEnd: trialEnd },
  });

  // TODO: Implement logic to notify the user about trial ending
  console.log(
    `Trial ending soon for subscription ${subscriptionId}. Trial ends on ${trialEnd.toLocaleString()}`,
  );
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await db.stripeSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  console.log(`Invoice paid for subscription ${subscriptionId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  await db.stripeSubscription.update({
    where: { id: subscriptionId },
    data: { status: "past_due" },
  });

  // TODO: Implement logic to notify the user about payment failure
  console.log(`Payment failed for subscription ${subscriptionId}`);
}
