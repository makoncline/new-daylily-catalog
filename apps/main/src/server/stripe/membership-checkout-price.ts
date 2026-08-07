import type Stripe from "stripe";
import type { SubscriptionBillingOption } from "@/config/subscription-config";
import { getStripeClient } from "@/server/stripe/client";

export const MEMBERSHIP_CHECKOUT_LOOKUP_KEY =
  "daylily_catalog_pro_monthly_checkout";
export const HOSTED_BILLING_CHOICE = "stripe_checkout_upsell";

export interface MembershipCheckoutPrice {
  currency: string;
  priceId: string;
  productId: string;
}

function getProductId(
  product: string | Stripe.Product | Stripe.DeletedProduct,
) {
  return typeof product === "string" ? product : product.id;
}

function hasAmount(price: Stripe.Price) {
  return price.unit_amount !== null || price.unit_amount_decimal !== null;
}

export function validateMembershipCheckoutPrice(
  price: Stripe.Price,
): MembershipCheckoutPrice {
  if (!price.active) {
    throw new Error("Stripe membership checkout price is not active.");
  }
  if (!price.recurring || price.type !== "recurring") {
    throw new Error("Stripe membership checkout price is not recurring.");
  }
  if (
    price.recurring.interval !== "month" ||
    price.recurring.interval_count !== 1
  ) {
    throw new Error("Stripe membership checkout price must recur every month.");
  }
  if (!hasAmount(price)) {
    throw new Error("Stripe membership checkout price is missing an amount.");
  }

  return {
    currency: price.currency,
    priceId: price.id,
    productId: getProductId(price.product),
  };
}

export async function getMembershipCheckoutPrice() {
  const stripe = getStripeClient();
  const prices = await stripe.prices.list({
    active: true,
    limit: 2,
    lookup_keys: [MEMBERSHIP_CHECKOUT_LOOKUP_KEY],
    type: "recurring",
  });

  if (prices.data.length !== 1) {
    throw new Error(
      `Stripe must have exactly one active price with lookup key ${MEMBERSHIP_CHECKOUT_LOOKUP_KEY}.`,
    );
  }

  return validateMembershipCheckoutPrice(prices.data[0]!);
}

export function getMembershipBillingOption({
  currency,
  lineItems,
  productId,
}: {
  currency: string;
  lineItems: Stripe.LineItem[];
  productId: string;
}): SubscriptionBillingOption {
  if (lineItems.length !== 1) {
    throw new Error("Stripe membership checkout must contain one line item.");
  }

  const price = lineItems[0]!.price;
  if (
    !price?.active ||
    price.type !== "recurring" ||
    price.recurring?.interval_count !== 1 ||
    !hasAmount(price) ||
    getProductId(price.product) !== productId ||
    price.currency !== currency
  ) {
    throw new Error("Stripe returned an invalid membership checkout price.");
  }

  if (price.recurring.interval === "month") {
    return "monthly";
  }
  if (price.recurring.interval === "year") {
    return "annual";
  }

  throw new Error(
    "Stripe returned an unsupported membership billing interval.",
  );
}

export async function getCheckoutSessionBillingOption(
  session: Stripe.Checkout.Session,
) {
  const productId = session.metadata?.membership_product_id;
  const currency = session.metadata?.membership_currency;
  if (
    session.metadata?.billing_choice !== HOSTED_BILLING_CHOICE ||
    !productId ||
    !currency
  ) {
    throw new Error("Stripe membership checkout metadata is incomplete.");
  }

  const stripe = getStripeClient();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 2,
  });

  return getMembershipBillingOption({
    currency,
    lineItems: lineItems.data,
    productId,
  });
}

export async function finalizeMembershipCheckoutSession(
  session: Stripe.Checkout.Session,
) {
  if (session.metadata?.billing_choice !== HOSTED_BILLING_CHOICE) {
    return null;
  }

  const billingOption = await getCheckoutSessionBillingOption(session);
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) {
    throw new Error("Stripe membership checkout has no subscription.");
  }

  const stripe = getStripeClient();
  await Promise.all([
    stripe.checkout.sessions.update(session.id, {
      metadata: { billing_option: billingOption },
    }),
    stripe.subscriptions.update(subscriptionId, {
      metadata: { billing_option: billingOption },
    }),
  ]);

  return billingOption;
}
