import Stripe from "stripe";

let stripeClient: Stripe | undefined;

function requireStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required.");
  }

  return secretKey;
}

export function getStripeClient() {
  stripeClient ??= new Stripe(requireStripeSecretKey(), {
    apiVersion: "2025-08-27.basil",
  });

  return stripeClient;
}
