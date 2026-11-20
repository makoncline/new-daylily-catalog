// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/catalog-importer-checkout-router.sqlite";

const checkoutRetrieve = vi.hoisted(() => vi.fn());
const captureEvent = vi.hoisted(() => vi.fn());

vi.mock("@/server/stripe/client", () => ({
  getStripeClient: () => ({
    checkout: { sessions: { retrieve: checkoutRetrieve } },
  }),
}));

vi.mock("@/server/analytics/posthog-server", () => ({
  captureServerPosthogEvent: captureEvent,
}));

const sessionId = "cs_test_claim";
const customerId = "cus_claimed";
const email = "paid@example.com";
const importId = "123e4567-e89b-42d3-a456-426614174000";
const validMetadata = {
  billing_option: "annual",
  entry_source: "catalog_importer",
  import_id: importId,
  return_to: "/playground",
  source: "catalog_importer",
};
const session = {
  id: sessionId,
  metadata: validMetadata,
  customer: customerId,
  customer_email: email,
  subscription: { status: "trialing" },
};

async function withClaimAccount(
  run: (account: {
    claim: (checkoutSessionId?: string) => Promise<unknown>;
    db: TRPCInternalContext["db"];
    id: string;
  }) => Promise<void>,
  account: { email?: string; stripeCustomerId?: string } = {},
) {
  await withTempAppDb(async () => {
    const { db } = await import("@/server/db");
    const { catalogImporterRouter } = await import(
      "@/server/api/routers/catalog-importer"
    );
    const user = await db.user.create({
      data: {
        clerkUserId: "clerk_claim_stripe_checkout",
        stripeCustomerId: account.stripeCustomerId,
      },
    });
    const caller = catalogImporterRouter.createCaller({
      db,
      headers: new Headers(),
      _authUser: {
        ...user,
        clerk: { email: account.email ?? email, createdAt: Date.now() },
      } as unknown as TRPCInternalContext["_authUser"],
    });
    await run({
      db,
      id: user.id,
      claim: (checkoutSessionId = sessionId) =>
        caller.claimCheckout({ sessionId: checkoutSessionId }),
    });
  });
}

async function readCustomerId(db: TRPCInternalContext["db"], id: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id } });
  return user.stripeCustomerId;
}

describe("catalog importer checkout claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkoutRetrieve.mockResolvedValue(session);
  });

  it("links a Playground session and records the membership activation", async () => {
    await withClaimAccount(async ({ claim, db, id }) => {
      await expect(claim()).resolves.toEqual({ ok: true });
      await expect(readCustomerId(db, id)).resolves.toBe(customerId);
      expect(captureEvent).toHaveBeenCalledWith({
        distinctId: "clerk_claim_stripe_checkout",
        event: "trial_started",
        properties: {
          $insert_id: `catalog-importer:trial_started:${sessionId}`,
          import_id: importId,
          billing_option: "annual",
          source: "catalog_importer",
          source_page: "/catalog-importer/checkout/success",
          stripe_customer_id: customerId,
          subscription_status: "trialing",
        },
      });
    });
  });

  it("rejects sessions from another entry source for both status and claim", async () => {
    checkoutRetrieve.mockResolvedValue({
      ...session,
      metadata: { ...validMetadata, entry_source: "dashboard" },
    });
    const { getCatalogImporterCheckoutStatus } = await import(
      "@/server/catalog-importer/checkout-service"
    );
    await expect(
      getCatalogImporterCheckoutStatus(sessionId),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await withClaimAccount(async ({ claim, db, id }) => {
      await expect(claim()).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(readCustomerId(db, id)).resolves.toBeNull();
    });
  });

  it("rejects a claim from a different account email", async () => {
    await withClaimAccount(
      async ({ claim, db, id }) => {
        await expect(claim()).rejects.toMatchObject({ code: "FORBIDDEN" });
        await expect(readCustomerId(db, id)).resolves.toBeNull();
      },
      { email: "other@example.com" },
    );
  });

  it("does not claim a customer linked to another account", async () => {
    await withClaimAccount(async ({ claim, db, id }) => {
      const owner = await db.user.create({
        data: { stripeCustomerId: customerId },
      });
      await expect(claim()).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(readCustomerId(db, id)).resolves.toBeNull();
      await expect(readCustomerId(db, owner.id)).resolves.toBe(customerId);
    });
  });

  it("binds only one customer when two paid claims overlap", async () => {
    const otherSessionId = "cs_test_other_claim";
    const otherCustomerId = "cus_other_claim";
    checkoutRetrieve.mockImplementation(async (id: string) => ({
      ...session,
      id,
      customer: id === sessionId ? customerId : otherCustomerId,
      metadata: { ...validMetadata, return_to: "/catalog-importer" },
      subscription: { status: "active" },
    }));

    await withClaimAccount(async ({ claim, db, id }) => {
      const results = await Promise.allSettled([
        claim(),
        claim(otherSessionId),
      ]);
      expect(results).toEqual(
        expect.arrayContaining([
          { status: "fulfilled", value: { ok: true } },
          {
            status: "rejected",
            reason: expect.objectContaining({
              code: "CONFLICT",
              message: "This account already has different billing details.",
            }),
          },
        ]),
      );
      const firstClaimWon = results[0].status === "fulfilled";
      const winningCustomer = firstClaimWon ? customerId : otherCustomerId;
      await expect(readCustomerId(db, id)).resolves.toBe(winningCustomer);
      await expect(
        claim(firstClaimWon ? sessionId : otherSessionId),
      ).resolves.toEqual({ ok: true });
    });
  });

  it("does not replace the account's existing customer", async () => {
    await withClaimAccount(
      async ({ claim, db, id }) => {
        await expect(claim()).rejects.toMatchObject({ code: "CONFLICT" });
        await expect(readCustomerId(db, id)).resolves.toBe("cus_existing");
      },
      { stripeCustomerId: "cus_existing" },
    );
  });
});
