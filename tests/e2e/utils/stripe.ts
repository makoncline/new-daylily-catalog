import { getStripeCustomerKey } from "@/server/stripe/sync-subscription";
import type { E2EPrismaClient } from "../../../src/lib/test-utils/e2e-db";

interface SetStripeSubscriptionStatusInput {
  db: E2EPrismaClient;
  stripeCustomerId: string;
  status?: string;
}

export async function setStripeSubscriptionStatus({
  db,
  stripeCustomerId,
  status = "active",
}: SetStripeSubscriptionStatusInput) {
  const key = getStripeCustomerKey(stripeCustomerId);
  await db.keyValue.upsert({
    where: { key },
    update: { value: JSON.stringify({ status }) },
    create: { key, value: JSON.stringify({ status }) },
  });
}
