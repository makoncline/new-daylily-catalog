import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

const PENDING_SESSION_KEY_PREFIX = "catalog-importer-checkout:";

interface PendingCatalogImporterCheckout {
  sessionId: string;
  customerId: string;
  email: string;
  importId: string;
  status: string;
  created: number;
}

export interface LocalCatalogImporterCheckoutDetails {
  sessionId: string;
  customerId: string;
  email: string;
  importId: string;
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
  importId,
}: {
  db: PrismaClient;
  email: string;
  importId: string;
}) {
  const sessionId = `cs_test_catalog_importer_${randomUUID()}`;
  const customerId = `cus_e2e_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const created = Math.floor(Date.now() / 1000);
  const pendingSession: PendingCatalogImporterCheckout = {
    sessionId,
    customerId,
    email,
    importId,
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
): Promise<LocalCatalogImporterCheckoutDetails | null> {
  const row = await db.keyValue.findUnique({
    where: { key: getPendingSessionKey(sessionId) },
  });

  if (!row) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.value) as PendingCatalogImporterCheckout;

    return {
      sessionId: parsed.sessionId,
      customerId: parsed.customerId,
      email: parsed.email.toLowerCase(),
      importId: parsed.importId,
      status: parsed.status,
      created: parsed.created,
    };
  } catch {
    return null;
  }
}
