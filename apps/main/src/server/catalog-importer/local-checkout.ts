import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { SubscriptionBillingOption } from "@/config/subscription-config";

const PENDING_SESSION_KEY_PREFIX = "catalog-importer-checkout:";
export const LOCAL_E2E_CHECKOUT_EMAIL =
  "importer-onboarding+clerk_test@example.com";

interface PendingCatalogImporterCheckout {
  sessionId: string;
  customerId: string;
  email: string;
  importId: string;
  billingOption: SubscriptionBillingOption;
  source: string;
  status: string;
  created: number;
}

export interface LocalCatalogImporterCheckoutDetails {
  sessionId: string;
  customerId: string;
  email: string;
  importId: string;
  billingOption: SubscriptionBillingOption;
  source: string;
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
  importId,
}: {
  db: PrismaClient;
  importId: string;
}) {
  const sessionId = `cs_test_catalog_importer_${randomUUID()}`;
  const customerId = `cus_e2e_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const created = Math.floor(Date.now() / 1000);
  const billingOption: SubscriptionBillingOption = "annual";
  const pendingSession: PendingCatalogImporterCheckout = {
    sessionId,
    customerId,
    email: LOCAL_E2E_CHECKOUT_EMAIL,
    importId,
    billingOption,
    source: "catalog_importer",
    status: "active",
    created,
  };
  const subscriptionSnapshot = {
    subscriptionId: `sub_e2e_${sessionId}`,
    status: "active",
    priceId: "price_e2e_annual",
    currentPeriodStart: created,
    currentPeriodEnd: created + 365 * 24 * 60 * 60,
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
      billingOption: parsed.billingOption,
      source: parsed.source,
      status: parsed.status,
      created: parsed.created,
    };
  } catch {
    return null;
  }
}
