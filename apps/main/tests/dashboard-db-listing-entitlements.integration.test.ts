// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TRPCInternalContext } from "@/server/api/trpc";
import { APP_CONFIG } from "@/config/constants";
import { withTempAppDb } from "@/lib/test-utils/app-test-db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL ??=
  "file:./tests/.tmp/dashboard-db-listing-entitlements.sqlite";

const getStripeSubscriptionResult = vi.hoisted(() => vi.fn());
const getStripeSubscription = vi.hoisted(() => vi.fn());

vi.mock("@/server/stripe/sync-subscription", () => ({
  getStripeSubscription,
  getStripeSubscriptionResult,
}));

async function createAuthedCaller(userId: string) {
  const { db } = await import("@/server/db");
  const { createCaller } = await import("@/server/api/root");
  const caller = createCaller(async () => {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      db,
      headers: new Headers(),
      _authUser: user as unknown as TRPCInternalContext["_authUser"],
    } satisfies TRPCInternalContext;
  });

  return { caller, db } satisfies {
    caller: ReturnType<typeof createCaller>;
    db: TRPCInternalContext["db"];
  };
}

async function seedFreeTierLimit(
  db: TRPCInternalContext["db"],
  userId: string,
) {
  await db.listing.createMany({
    data: Array.from(
      { length: APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS },
      (_, index) => ({
        userId,
        title: `Listing ${index + 1}`,
        slug: `listing-${index + 1}`,
      }),
    ),
  });
}

describe("dashboard listing creation entitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks a confirmed free account at the server-side listing limit", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "none" },
      confirmed: true,
    });

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      await seedFreeTierLimit(db, user.id);

      await expect(
        caller.dashboardDb.listing.create({ title: "One Too Many" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        db.listing.count({ where: { userId: user.id } }),
      ).resolves.toBe(APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS);
    });
  });

  it.each([
    {
      name: "active Pro account",
      result: {
        subscription: { status: "active" },
        confirmed: true,
      },
    },
    {
      name: "temporarily unconfirmed Stripe lookup",
      result: {
        subscription: { status: "none" },
        confirmed: false,
      },
    },
  ])("allows creation for an $name", async ({ result }) => {
    getStripeSubscriptionResult.mockResolvedValue(result);

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      await seedFreeTierLimit(db, user.id);

      await expect(
        caller.dashboardDb.listing.create({ title: "Allowed Listing" }),
      ).resolves.toMatchObject({ title: "Allowed Listing" });
      await expect(
        db.listing.count({ where: { userId: user.id } }),
      ).resolves.toBe(APP_CONFIG.LISTING.FREE_TIER_MAX_LISTINGS + 1);
    });
  });

  it("imports listing rows once when a batch is retried", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "trialing" },
      confirmed: true,
    });

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      const rows = [
        {
          cultivarReferenceId: null,
          description: "First import row",
          importKey: "project-1:source-row-2",
          price: 12,
          privateNote: "Front bed",
          title: "Stella de Oro",
        },
        {
          cultivarReferenceId: null,
          description: "Second size",
          importKey: "project-1:source-row-3",
          price: 10,
          privateNote: null,
          title: "Stella de Oro",
        },
      ];

      await expect(
        caller.dashboardDb.listing.importRows({ rows }),
      ).resolves.toMatchObject({ createdCount: 2, existingCount: 0 });
      await expect(
        caller.dashboardDb.listing.importRows({ rows }),
      ).resolves.toMatchObject({ createdCount: 0, existingCount: 2 });

      const listings = await db.listing.findMany({
        where: { userId: user.id },
        orderBy: { slug: "asc" },
      });
      expect(listings).toHaveLength(2);
      expect(listings.map((listing) => listing.slug)).toEqual([
        "stella-de-oro",
        "stella-de-oro-1",
      ]);
      expect(listings[0]).toMatchObject({
        description: "First import row",
        importKey: "project-1:source-row-2",
        price: 12,
        privateNote: "Front bed",
      });
    });
  });

  it("skips exact existing listings and requires a decision for changed ones", async () => {
    getStripeSubscriptionResult.mockResolvedValue({
      subscription: { status: "trialing" },
      confirmed: true,
    });

    await withTempAppDb(async ({ user }) => {
      const { caller, db } = await createAuthedCaller(user.id);
      await db.listing.create({
        data: {
          description: "Display row",
          price: 15,
          privateNote: "Front bed",
          slug: "happy-returns",
          title: "Happy Returns",
          userId: user.id,
        },
      });

      const exactRow = {
        cultivarReferenceId: null,
        description: "Display row",
        importKey: "project-2:source-row-2",
        price: 15,
        privateNote: "Front bed",
        title: "Happy Returns",
      };
      await expect(
        caller.dashboardDb.listing.importRows({ rows: [exactRow] }),
      ).resolves.toMatchObject({
        createdCount: 0,
        skippedExactCount: 1,
      });

      const changedRow = {
        ...exactRow,
        importKey: "project-2:source-row-3",
        price: 18,
      };
      await expect(
        caller.dashboardDb.listing.importRows({ rows: [changedRow] }),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      await expect(
        caller.dashboardDb.listing.importRows({
          rows: [{ ...changedRow, allowExistingDuplicate: true }],
        }),
      ).resolves.toMatchObject({ createdCount: 1, skippedExactCount: 0 });
      await expect(
        db.listing.count({ where: { userId: user.id } }),
      ).resolves.toBe(2);
    });
  });
});
