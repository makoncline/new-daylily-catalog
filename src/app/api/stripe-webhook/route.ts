import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { env } from "@/env";
import { db } from "@/server/db";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

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

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(event.data.object);
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await handleSubscriptionChange(event.data.object, event.type);
          break;
        default:
          console.log(`Unhandled relevant event: ${event.type}`);
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (
    !session.customer ||
    !session.customer_details?.email ||
    session.mode !== "subscription"
  ) {
    console.error("Missing required session data or not a subscription", {
      customer: session.customer,
      email: session.customer_details?.email,
      mode: session.mode,
    });
    return;
  }

  const customerId = session.customer as string;
  const customerResponse = await stripe.customers.retrieve(customerId);

  if (!("metadata" in customerResponse) || customerResponse.deleted) {
    console.error("Customer not found or is deleted", { customerId });
    return;
  }

  const userId = customerResponse.metadata.userId;
  const email = session.customer_details.email;
  const name = session.customer_details.name ?? email;

  if (!userId) {
    console.error("No userId found in customer metadata", { customerId });
    return;
  }

  await db.stripeCustomer.upsert({
    where: { id: customerId },
    update: {
      email,
      name,
    },
    create: {
      id: customerId,
      userId,
      email,
      name,
    },
  });

  // Handle subscription status if this is a subscription checkout
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
      {
        expand: ["default_payment_method"],
      },
    );

    await handleSubscriptionChange(
      subscription,
      "customer.subscription.created",
    );
  }

  console.log(`Customer record created/updated for user ${userId}`);
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  eventType:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted",
) {
  if (!subscription.id || !subscription.customer) {
    throw new Error("Missing required subscription data");
  }

  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0]!.price.id;
  const productId = subscription.items.data[0]!.price.product as string;

  const customer = await db.stripeCustomer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    console.error(`No customer found for ID ${customerId}`);
    return;
  }

  const subscriptionData = {
    status: subscription.status,
    priceId,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  // First, try to find an existing subscription for this customer
  const existingSubscription = await db.stripeSubscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (existingSubscription) {
    // If subscription IDs match, update it
    if (existingSubscription.id === subscriptionId) {
      await db.stripeSubscription.update({
        where: { id: subscriptionId },
        data: subscriptionData,
      });
    } else {
      // If IDs don't match, delete old subscription and create new one
      await db.stripeSubscription.delete({
        where: { id: existingSubscription.id },
      });
      await db.stripeSubscription.create({
        data: {
          ...subscriptionData,
          id: subscriptionId,
          userId: customer.userId,
          stripeCustomerId: customerId,
        },
      });
    }
  } else {
    // If no existing subscription, create new one
    await db.stripeSubscription.create({
      data: {
        ...subscriptionData,
        id: subscriptionId,
        userId: customer.userId,
        stripeCustomerId: customerId,
      },
    });
  }

  const action = {
    "customer.subscription.created": "created",
    "customer.subscription.updated": "updated",
    "customer.subscription.deleted": "canceled",
  }[eventType];

  console.log(
    `Subscription ${subscriptionId} ${action} for user ${customer.userId} (Product: ${productId})`,
  );
}
