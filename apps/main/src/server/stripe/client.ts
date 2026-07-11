import Stripe from "stripe";
import { env, requireEnv } from "@/env";
import { isHermeticMode } from "@/lib/hermetic/runtime.js";
import { createHermeticStripeClient } from "@/lib/hermetic/stripe";

let stripeClient: Stripe | undefined;

export function getStripeClient() {
  if (isHermeticMode()) {
    stripeClient ??= createHermeticStripeClient();
    return stripeClient;
  }

  stripeClient ??= new Stripe(
    requireEnv("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY),
    {
      apiVersion: "2025-08-27.basil",
    },
  );

  return stripeClient;
}
