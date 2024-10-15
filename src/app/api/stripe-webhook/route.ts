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
        await handleCheckoutSessionCompleted(event.data.object);
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

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  // Extract metadata (ensure you included userId when creating the checkout session)
  const userId = session.metadata?.userId;

  if (!userId) {
    throw new Error("Missing userId in session metadata.");
  }

  // Extract customer details
  const customerId = session.customer as string;
  const customerEmail = session.customer_details?.email ?? null;
  const customerName = session.customer_details?.name ?? null;

  // Retrieve the subscription ID from the session
  const subscriptionId = session.subscription as string;

  // Retrieve the subscription object from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Map Stripe's subscription data to your Prisma models
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  // Perform database operations within a transaction for data integrity
  await db.$transaction(async (tx) => {
    // Upsert StripeCustomer
    await tx.stripeCustomer.upsert({
      where: { id: customerId },
      update: {
        email: customerEmail,
        name: customerName,
        // updatedAt is handled automatically
      },
      create: {
        id: customerId,
        userId: userId,
        email: customerEmail,
        name: customerName,
      },
    });

    // Upsert StripeSubscription
    await tx.stripeSubscription.upsert({
      where: { id: subscriptionId },
      update: {
        status: status,
        priceId: priceId,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: cancelAtPeriodEnd,
        // updatedAt is handled automatically
      },
      create: {
        id: subscriptionId,
        userId: userId,
        stripeCustomerId: customerId,
        status: status,
        priceId: priceId,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: cancelAtPeriodEnd,
      },
    });
  });

  console.log(`✅ Handled checkout.session.completed for user ${userId}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  // Retrieve the subscription from Stripe to get the latest details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  // Update the subscription in your database
  await db.stripeSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: status,
      currentPeriodEnd: currentPeriodEnd,
      // Update other fields if necessary
    },
  });

  console.log(`✅ Handled invoice.paid for subscription ${subscriptionId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  // Optionally, you can implement retry logic or mark the subscription as past due
  // For simplicity, we'll update the status to 'past_due'

  await db.stripeSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: "past_due", // Ensure this matches your Prisma model's expected status values
      // Update other fields if necessary
    },
  });

  // Optionally, notify the customer via email or other channels
  console.log(
    `⚠️  Payment failed for subscription ${subscriptionId}. Status updated to past_due.`,
  );
}
