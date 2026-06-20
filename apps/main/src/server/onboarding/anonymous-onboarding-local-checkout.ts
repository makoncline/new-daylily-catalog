import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

const PENDING_SESSION_KEY_PREFIX = "anonymous-onboarding-checkout:";

interface PendingAnonymousCheckoutSession {
  sessionId: string;
  customerId: string;
  email: string;
  status: string;
  created: number;
}

export interface LocalAnonymousCheckoutDetails {
  sessionId: string;
  customerId: string;
  email: string;
  status: string | null;
  created: number;
}

function getPendingSessionKey(sessionId: string) {
  return `${PENDING_SESSION_KEY_PREFIX}${sessionId}`;
}

function getStripeCustomerKey(customerId: string) {
  return `stripe:customer:${customerId}`;
}

export function isLocalE2ECheckoutEnabled() {
  return (
    process.env.PLAYWRIGHT_LOCAL_E2E === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export async function createLocalE2ECheckoutSession({
  db,
  email,
}: {
  db: PrismaClient;
  email: string;
}) {
  const sessionId = `cs_test_onboarding_${randomUUID()}`;
  const customerId = `cus_e2e_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const created = Math.floor(Date.now() / 1000);
  const pendingSession: PendingAnonymousCheckoutSession = {
    sessionId,
    customerId,
    email,
    status: "trialing",
    created,
  };
  const subscriptionSnapshot = {
    subscriptionId: `sub_e2e_${sessionId}`,
    status: "trialing",
    priceId: "price_e2e",
    currentPeriodStart: created,
    currentPeriodEnd: created + 7 * 24 * 60 * 60,
    cancelAtPeriodEnd: false,
    paymentMethod: { brand: "visa", last4: "4242" },
  };

  await Promise.all([
    db.keyValue.upsert({
      where: { key: getPendingSessionKey(sessionId) },
      update: { value: JSON.stringify(pendingSession) },
      create: {
        key: getPendingSessionKey(sessionId),
        value: JSON.stringify(pendingSession),
      },
    }),
    db.keyValue.upsert({
      where: { key: getStripeCustomerKey(customerId) },
      update: { value: JSON.stringify(subscriptionSnapshot) },
      create: {
        key: getStripeCustomerKey(customerId),
        value: JSON.stringify(subscriptionSnapshot),
      },
    }),
  ]);

  return pendingSession;
}

export async function getLocalE2ECheckoutDetails(
  db: PrismaClient,
  sessionId: string,
): Promise<LocalAnonymousCheckoutDetails | null> {
  const row = await db.keyValue.findUnique({
    where: { key: getPendingSessionKey(sessionId) },
  });

  if (!row) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.value) as PendingAnonymousCheckoutSession;

    return {
      sessionId: parsed.sessionId,
      customerId: parsed.customerId,
      email: parsed.email.toLowerCase(),
      status: parsed.status,
      created: parsed.created,
    };
  } catch {
    return null;
  }
}
