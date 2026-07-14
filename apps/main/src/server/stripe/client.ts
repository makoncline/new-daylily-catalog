import Stripe from "stripe";
import { env, requireEnv } from "@/env";
import { isHermeticMode } from "@/lib/hermetic/runtime.js";

let stripeClient: Stripe | undefined;

export function getStripeClient() {
  stripeClient ??= new Stripe(
    requireEnv("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY),
    {
      apiVersion: "2025-08-27.basil",
      ...(isHermeticMode()
        ? { httpClient: Stripe.createFetchHttpClient() }
        : {}),
    },
  );

  return stripeClient;
}
