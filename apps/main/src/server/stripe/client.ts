import Stripe from "stripe";
import { env, requireEnv } from "@/env";

let stripeClient: Stripe | undefined;

function getIntegrationStripeConfig(): Stripe.StripeConfig {
  if (process.env.INTEGRATION_MODE !== "1") return {};

  const providerUrl = new URL(
    process.env.INTEGRATION_PROVIDER_URL ?? "http://127.0.0.1:3211",
  );
  return {
    host: providerUrl.hostname,
    port: providerUrl.port,
    protocol: providerUrl.protocol === "https:" ? "https" : "http",
  };
}

export function getStripeClient() {
  stripeClient ??= new Stripe(
    requireEnv("STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY),
    {
      apiVersion: "2025-08-27.basil",
      ...getIntegrationStripeConfig(),
    },
  );

  return stripeClient;
}
