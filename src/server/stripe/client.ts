import Stripe from "stripe";
import { env } from "@/env";

// In tests/CI where Stripe key is not provided, construct a harmless client
// so imports don’t crash. Routers should only call Stripe in flows that aren’t
// exercised by these tests.
const key = env.STRIPE_SECRET_KEY || "sk_test_dummy";

export const stripe = new Stripe(key, {
  apiVersion: "2024-09-30.acacia",
});
